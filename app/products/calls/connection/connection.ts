// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {RTCMonitor, RTCPeer, parseRTCStats} from '@mattermost/calls/lib';
import {hasDCSignalingLockSupport} from '@mattermost/calls/lib/utils';
import {zlibSync, strToU8} from 'fflate';
import {DeviceEventEmitter, type EmitterSubscription, NativeEventEmitter, NativeModules, Platform} from 'react-native';
import InCallManager from 'react-native-incall-manager';
import {mediaDevices, MediaStream, MediaStreamTrack, registerGlobals, RTCSessionDescription} from 'react-native-webrtc';

import {setPreferredAudioRoute, setSpeakerphoneOn} from '@calls/actions/calls';
import {
    foregroundServiceStart,
    foregroundServiceStop,
    foregroundServiceSetup,
} from '@calls/connection/foreground_service';
import {processMeanOpinionScore, setAudioDeviceInfo} from '@calls/state';
import {AudioDevice, type AudioDeviceInfo, type AudioDeviceInfoRaw, type CallsConnection} from '@calls/types/calls';
import {getICEServersConfigs} from '@calls/utils';
import {WebsocketEvents} from '@constants';
import {getServerCredentials} from '@init/credentials';
import NetworkManager from '@managers/network_manager';
import {getErrorMessage, getFullErrorMessage} from '@utils/errors';
import {logDebug, logError, logInfo, logWarning} from '@utils/log';

import {WebSocketClient, wsReconnectionTimeoutErr} from './websocket_client';

import type {EmojiData} from '@mattermost/calls/lib/types';

const peerConnectTimeout = 5000;
const rtcMonitorInterval = 10000;

const InCallManagerEmitter = new NativeEventEmitter(NativeModules.InCallManager);

// Setup the foreground service channel
if (Platform.OS === 'android') {
    foregroundServiceSetup();
}

export async function newConnection(
    serverUrl: string,
    channelID: string,
    closeCb: (err?: Error) => void,
    setScreenShareURL: (url: string) => void,
    hasMicPermission: boolean,
    title?: string,
    rootId?: string,
) {
    let peer: RTCPeer | null = null;
    let stream: MediaStream;
    let voiceTrackAdded = false;
    let voiceTrack: MediaStreamTrack | null = null;
    let isClosed = false;
    let onCallEnd: EmitterSubscription | null = null;
    let audioDeviceChanged: EmitterSubscription | null = null;
    let wiredHeadsetEvent: EmitterSubscription | null = null;
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

    const ws = new WebSocketClient(serverUrl, client.getWebSocketUrl(), credentials?.token);

    // Throws an error, to be caught by caller.
    await ws.initialize();

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
        InCallManager.stop();
        audioDeviceChanged?.remove();
        wiredHeadsetEvent?.remove();

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

        InCallManager.start();
        InCallManager.stopProximitySensor();

        let btInitialized = false;
        let speakerInitialized = false;

        if (Platform.OS === 'android') {
            audioDeviceChanged = DeviceEventEmitter.addListener('onAudioDeviceChanged', (data: AudioDeviceInfoRaw) => {
                const info: AudioDeviceInfo = {
                    availableAudioDeviceList: JSON.parse(data.availableAudioDeviceList),
                    selectedAudioDevice: data.selectedAudioDevice,
                };
                setAudioDeviceInfo(info);
                logDebug('calls: AudioDeviceChanged, info:', info);

                // Auto switch to bluetooth the first time we connect to bluetooth, but not after.
                if (!btInitialized) {
                    if (info.availableAudioDeviceList.includes(AudioDevice.Bluetooth)) {
                        setPreferredAudioRoute(AudioDevice.Bluetooth);
                        btInitialized = true;
                    } else if (!speakerInitialized) {
                        // If we don't have bluetooth available, default to speakerphone on.
                        setPreferredAudioRoute(AudioDevice.Speakerphone);
                        speakerInitialized = true;
                    }
                }
            });

            // To allow us to use microphone in the background
            await foregroundServiceStart();
        }

        // We default to speakerphone, but not if the WiredHeadset is plugged in.
        if (Platform.OS === 'ios') {
            wiredHeadsetEvent = InCallManagerEmitter.addListener('WiredHeadset', (data) => {
                // Log for customer debugging. For the moment we're not changing output labels because of incall-manager iOS
                // limitations with how it reports Bluetooth -- namely that it doesn't, so we don't know when Bluetooth is
                // overriding the earpiece and/or headset.
                logDebug('calls: WiredHeadset plugged in, data:', data);

                // iOS switches to the headset when we connect it, so turn off speakerphone to keep UI in sync.
                if (data.isPlugged) {
                    setSpeakerphoneOn(false);
                }
            });

            // If headset is plugged in when the call starts, use it.
            const report = await InCallManager.getIsWiredHeadsetPluggedIn();
            if (report.isWiredHeadsetPluggedIn) {
                setSpeakerphoneOn(false);
            } else {
                setSpeakerphoneOn(true);
            }
        }

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
        const waitForReadyImpl = (callback: () => void, fail: (reason: string) => void, timeout: number) => {
            if (timeout <= 0) {
                fail('timed out waiting for peer connection');
                return;
            }
            setTimeout(() => {
                if (peer?.connected) {
                    rtcMonitor?.start();
                    callback();
                } else {
                    waitForReadyImpl(callback, fail, timeout - 200);
                }
            }, 200);
        };

        return new Promise<void>((resolve, reject) => {
            waitForReadyImpl(resolve, reject, peerConnectTimeout);
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
    };

    return connection;
}
