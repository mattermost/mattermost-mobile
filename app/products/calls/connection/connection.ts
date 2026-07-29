// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {RTCMonitor, RTCPeer, parseRTCStats} from '@mattermost/calls/lib';
import {hasDCSignalingLockSupport} from '@mattermost/calls/lib/utils';
import CallsNative from '@mattermost/calls-native';
import {zlibSync, strToU8} from 'fflate';
import {DeviceEventEmitter, type EmitterSubscription, Platform} from 'react-native';
import {mediaDevices, MediaStream, MediaStreamTrack, registerGlobals, RTCSessionDescription} from 'react-native-webrtc';

import {setPreferredAudioRoute} from '@calls/actions/calls';
import {foregroundServiceStart, foregroundServiceStop} from '@calls/connection/foreground_service';
import {processMeanOpinionScore, setAudioDeviceInfo} from '@calls/state';
import {AudioDeviceValue, type AudioDevice, type CallsConnection} from '@calls/types/calls';
import {getICEServersConfigs} from '@calls/utils';
import {WebsocketEvents} from '@constants';
import {getServerCredentials} from '@init/credentials';
import NetworkManager from '@managers/network_manager';
import {getErrorMessage, getFullErrorMessage} from '@utils/errors';
import {logDebug, logError, logInfo, logWarning} from '@utils/log';

import {WebSocketClient, wsReconnectionTimeoutErr} from './websocket_client';

import type {EmojiData} from '@mattermost/calls/lib/types';
import type {IntlShape} from 'react-intl';

const peerConnectTimeout = 5000;
const rtcMonitorInterval = 10000;

export async function newConnection(
    serverUrl: string,
    channelID: string,
    closeCb: (err?: Error) => void,
    setScreenShareURL: (url: string) => void,
    hasMicPermission: boolean,
    intl: IntlShape,
    title?: string,
    rootId?: string,
) {
    let peer: RTCPeer | null = null;
    let stream: MediaStream;
    let voiceTrackAdded = false;
    let voiceTrack: MediaStreamTrack | null = null;
    let isClosed = false;
    let onCallEnd: EmitterSubscription | null = null;
    let audioRouteEvent: EmitterSubscription | null = null;

    // Resolver for waitForPeerConnection. Set before peer exists;
    // called from inside ws.on('join') once peer emits 'connect'.
    let onPeerConnected: ((sessionId: string) => void) | null = null;

    const streams: MediaStream[] = [];
    let rtcMonitor: RTCMonitor | null = null;
    const logger = {
        logDebug,
        logErr: logError,
        logWarn: logWarning,
        logInfo,
    };

    const initializeVoiceTrack = async () => {
        if (voiceTrack) {
            return;
        }

        try {
            stream = await mediaDevices.getUserMedia({
                video: false,
                audio: true,
            }) as MediaStream;
            voiceTrack = stream.getAudioTracks()[0];
            voiceTrack.enabled = false;
            streams.push(stream);
        } catch (err) {
            logError('calls: unable to get media device:', err);
        }
    };

    // Registering WebRTC globals (e.g. RTCPeerConnection)
    registerGlobals();

    // getClient can throw an error, which will be handled by the caller.
    const client = NetworkManager.getClient(serverUrl);
    const credentials = await getServerCredentials(serverUrl);

    let config;
    let version;
    try {
        [config, version] = await Promise.all([client.getCallsConfig(), client.getVersion()]);
    } catch (err) {
        throw new Error(`calls: fetching calls config and version info: ${getFullErrorMessage(err)}`);
    }

    let av1Support = false;
    if (config.EnableAV1 && !config.EnableSimulcast) {
        try {
            av1Support = Boolean(await RTCPeer.getVideoCodec('video/AV1'));
        } catch (err) {
            throw new Error(`calls: failed to check AV1 support: ${getErrorMessage(err)}`);
        }
    }

    let previousAvailableDevices: AudioDevice[] = [];
    let userSelectedRoute: AudioDevice | null = null;

    const getAutoRoute = (available: AudioDevice[]): AudioDevice => {
        if (available.includes(AudioDeviceValue.Bluetooth)) {
            return AudioDeviceValue.Bluetooth;
        }
        if (available.includes(AudioDeviceValue.WiredHeadset)) {
            return AudioDeviceValue.WiredHeadset;
        }
        return AudioDeviceValue.Earpiece;
    };

    const setUserSelectedAudioRoute = (route: AudioDevice) => {
        userSelectedRoute = route;
    };

    const ws = new WebSocketClient(serverUrl, client.getWebSocketUrl(), credentials?.token);

    await CallsNative.startAudioSession();

    try {
        await ws.initialize();
    } catch (err) {
        await CallsNative.stopAudioSession();

        // Rethrows the error, to be caught by the caller.
        throw err;
    }

    if (hasMicPermission) {
        initializeVoiceTrack();
    }

    const disconnect = (err?: Error) => {
        if (isClosed) {
            return;
        }
        isClosed = true;

        ws.send('leave');
        ws.close();
        rtcMonitor?.stop();

        if (onCallEnd) {
            onCallEnd.remove();
            onCallEnd = null;
        }

        streams.forEach((s) => {
            s.getTracks().forEach((track: MediaStreamTrack) => {
                track.stop();
                track.release();
            });
        });

        peer?.destroy();
        peer = null;
        CallsNative.stopAudioSession();
        audioRouteEvent?.remove();

        if (Platform.OS === 'android') {
            foregroundServiceStop();
        }

        if (closeCb) {
            closeCb(err);
        }
    };

    onCallEnd = DeviceEventEmitter.addListener(WebsocketEvents.CALLS_CALL_END, ({channelId}: { channelId: string }) => {
        if (channelId === channelID) {
            disconnect();
        }
    });

    const mute = () => {
        if (!peer || !voiceTrack) {
            return;
        }

        try {
            if (voiceTrackAdded) {
                peer.replaceTrack(voiceTrack.id, null);
            }
        } catch (e) {
            logError('calls: from RTCPeer, error on mute:', e);
            return;
        }

        voiceTrack.enabled = false;
        if (ws) {
            ws.send('mute');
        }
    };

    const unmute = () => {
        if (!peer || !voiceTrack) {
            return;
        }

        // NOTE: we purposely clear the monitor's stats cache upon unmuting
        // in order to skip some calculations since upon muting we actually
        // stop sending packets which would result in stats to be skewed as
        // soon as we resume sending.
        // This is not perfect but it avoids having to constantly send
        // silence frames when muted.
        rtcMonitor?.clearCache();

        try {
            if (voiceTrackAdded) {
                peer.replaceTrack(voiceTrack.id, voiceTrack);
            } else {
                peer.addStream(stream);
                voiceTrackAdded = true;
            }
        } catch (e) {
            logError('calls: from RTCPeer, error on unmute:', e);
            return;
        }

        voiceTrack.enabled = true;
        if (ws) {
            ws.send('unmute');
        }
    };

    const raiseHand = () => {
        if (ws) {
            ws.send('raise_hand');
        }
    };

    const unraiseHand = () => {
        if (ws) {
            ws.send('unraise_hand');
        }
    };

    const sendReaction = (emoji: EmojiData) => {
        if (ws) {
            ws.send('react', {
                data: JSON.stringify(emoji),
            });
        }
    };

    const collectICEStats = () => {
        const start = Date.now();
        const seenMap: {[key: string]: string} = {};

        const gatherStats = async () => {
            if (!peer) {
                return;
            }

            try {
                const stats = parseRTCStats(await peer.getStats()).iceStats;
                for (const state of Object.keys(stats)) {
                    for (const pair of stats[state]) {
                        const seenState = seenMap[pair.id];
                        seenMap[pair.id] = pair.state;

                        if (seenState !== pair.state) {
                            logDebug('calls: ice candidate pair stats', JSON.stringify(pair));
                        }

                        if (seenState === 'succeeded' || state !== 'succeeded') {
                            continue;
                        }

                        if (!pair.local || !pair.remote) {
                            continue;
                        }

                        ws.send('metric', {
                            metric_name: 'client_ice_candidate_pair',
                            data: JSON.stringify({
                                state: pair.state,
                                local: {
                                    type: pair.local.candidateType,
                                    protocol: pair.local.protocol,
                                },
                                remote: {
                                    type: pair.remote.candidateType,
                                    protocol: pair.remote.protocol,
                                },
                            }),
                        });
                    }
                }
            } catch (err) {
                logError('failed to parse ICE stats', err);
            }

            // Repeat the check for at most 30 seconds.
            if (Date.now() < start + 30000) {
                // We check every two seconds.
                setTimeout(gatherStats, 2000);
            }
        };

        gatherStats();
    };

    ws.on('error', (err: Error) => {
        logDebug('calls: ws error', err);
        if (err === wsReconnectionTimeoutErr) {
            disconnect();
        }
    });

    ws.on('close', (event: WebSocketCloseEvent) => {
        logDebug('calls: ws close, code:', event?.code, 'reason:', event?.reason, 'message:', event?.message);
    });

    ws.on('open', (originalConnID: string, prevConnID: string, isReconnect: boolean) => {
        if (isReconnect) {
            logDebug('calls: ws reconnect, sending reconnect msg');
            ws.send('reconnect', {
                channelID,
                originalConnID,
                prevConnID,
            });
        } else {
            logDebug('calls: ws open, sending join msg');
            ws.send('join', {
                channelID,
                title,
                threadID: rootId,
                av1Support,
                dcSignaling: config.EnableDCSignaling,
            });
        }
    });

    ws.on('join', async () => {
        logDebug('calls: join ack received, initializing connection');

        const iceConfigs = getICEServersConfigs(config);
        if (config.NeedsTURNCredentials) {
            try {
                iceConfigs.push(...await client.genTURNCredentials());
            } catch (err) {
                logWarning('calls: failed to fetch TURN credentials:', getFullErrorMessage(err));
            }
        }

        if (Platform.OS === 'android') {
            // To allow us to use microphone in the background
            foregroundServiceStart(intl);
        }

        // Listen for audio route changes on both platforms via calls-native.
        audioRouteEvent = CallsNative.onAudioRouteChanged((route) => {
            setAudioDeviceInfo(route);
            logDebug('calls: AudioRouteChanged, info:', route);

            const available = route.availableAudioDeviceList;

            // If the user's pinned device disappeared (e.g. BT headset ran out
            // of battery), clear their intent so auto-routing resumes.
            const selectedRouteDisconnected = Boolean(userSelectedRoute && !available.includes(userSelectedRoute));
            if (selectedRouteDisconnected) {
                userSelectedRoute = null;
            }

            // Re-route when a new device appears OR when the pinned device just
            // disconnected — in both cases the current route may no longer follow
            // the intended priority policy.
            const isNewDevice = (d: AudioDevice) => !previousAvailableDevices.includes(d);
            const newDeviceAppeared = available.some(isNewDevice);
            previousAvailableDevices = available;

            if (!userSelectedRoute && (selectedRouteDisconnected || newDeviceAppeared)) {
                setPreferredAudioRoute(getAutoRoute(available));
            }
        });

        // Set initial audio route based on current hardware state.
        const initialRoute = await CallsNative.getAudioRoute();
        setAudioDeviceInfo(initialRoute);
        previousAvailableDevices = initialRoute.availableAudioDeviceList;
        setPreferredAudioRoute(getAutoRoute(initialRoute.availableAudioDeviceList));

        peer = new RTCPeer({
            iceServers: iceConfigs || [],
            logger,
            dcSignaling: config.EnableDCSignaling,
            dcLocking: hasDCSignalingLockSupport(version),
        });

        collectICEStats();

        rtcMonitor = new RTCMonitor({
            peer,
            logger,
            monitorInterval: rtcMonitorInterval,
        });
        rtcMonitor.on('mos', processMeanOpinionScore);

        const sdpHandler = (sdp: RTCSessionDescription) => {
            const payload = JSON.stringify(sdp);

            // SDP data is compressed using zlib since it's text based
            // and can grow substantially, potentially hitting the maximum
            // message size (8KB).
            ws.send('sdp', {
                data: zlibSync(strToU8(payload)),
            }, true);
        };
        peer.on('offer', sdpHandler);
        peer.on('answer', sdpHandler);

        peer.on('candidate', (candidate) => {
            ws.send('ice', {
                data: JSON.stringify(candidate),
            });
        });

        peer.on('error', (err: any) => {
            logError('calls: peer error:', err);
            if (!isClosed) {
                disconnect();
            }
        });

        peer.on('stream', (remoteStream: MediaStream) => {
            logDebug('calls: new remote stream received', remoteStream.id);
            for (const track of remoteStream.getTracks()) {
                logDebug('calls: remote track', track.id);
            }

            streams.push(remoteStream);
            if (remoteStream.getVideoTracks().length > 0) {
                setScreenShareURL(remoteStream.toURL());
            }
        });

        peer.on('close', () => {
            logDebug('calls: peer closed');
            if (!isClosed) {
                disconnect();
            }
        });

        peer.once('connect', () => {
            if (onPeerConnected) {
                rtcMonitor?.start();
                onPeerConnected(ws.sessionID);
                onPeerConnected = null;
            }
        });
    });

    ws.on('message', ({data}: { data: string }) => {
        const msg = JSON.parse(data);
        if (!msg) {
            return;
        }
        if (msg.type === 'answer' || msg.type === 'candidate' || msg.type === 'offer') {
            peer?.signal(data);
        }
    });

    const waitForPeerConnection = () => {
        return new Promise<string>((resolve, reject) => {
            onPeerConnected = resolve;

            setTimeout(() => {
                if (onPeerConnected) {
                    onPeerConnected = null;
                    reject(new Error('timed out waiting for peer connection'));
                }
            }, peerConnectTimeout);
        });
    };

    const connection: CallsConnection = {
        disconnect,
        mute,
        unmute,
        waitForPeerConnection,
        raiseHand,
        unraiseHand,
        sendReaction,
        initializeVoiceTrack,
        setUserSelectedAudioRoute,
    };

    return connection;
}
