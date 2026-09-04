// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {RTCMonitor, RTCPeer, parseRTCStats} from '@mattermost/calls/lib';
import {hasDCSignalingLockSupport} from '@mattermost/calls/lib/utils';
import CallsNative from '@mattermost/calls-native';
import {zlibSync, strToU8} from 'fflate';
import {defineMessages, type IntlShape} from 'react-intl';
import {Alert, DeviceEventEmitter, type EmitterSubscription, Platform} from 'react-native';
import {mediaDevices, MediaStream, MediaStreamTrack, registerGlobals, RTCSessionDescription} from 'react-native-webrtc';

import {setPreferredAudioRoute} from '@calls/actions/calls';
import {foregroundServiceStart, foregroundServiceStop} from '@calls/connection/foreground_service';
import {processMeanOpinionScore, setAudioDeviceInfo, setMyVideoURL, setVideoURL} from '@calls/state';
import {AudioDevice, type AudioDeviceType, type CallsConnection} from '@calls/types/calls';
import {getICEServersConfigs} from '@calls/utils';
import {WebsocketEvents} from '@constants';
import {getServerCredentials} from '@init/credentials';
import NetworkManager from '@managers/network_manager';
import {getErrorMessage, getFullErrorMessage} from '@utils/errors';
import {logDebug, logError, logInfo, logWarning} from '@utils/log';

import {WebSocketClient, wsReconnectionTimeoutErr} from './websocket_client';

import type {EmojiData, TrackInfo} from '@mattermost/calls/lib/types';

const peerConnectTimeout = 5000;
const rtcMonitorInterval = 10000;
const videoEncodings = [{maxBitrate: 1000 * 1000, maxFramerate: 30, scaleResolutionDownBy: 1.0}];

const messages = defineMessages({
    startVideoFailedTitle: {
        id: 'mobile.calls_start_video_failed_title',
        defaultMessage: 'Unable to turn on your camera',
    },
    startVideoFailedDescription: {
        id: 'mobile.calls_start_video_failed_description',
        defaultMessage: 'Your camera could not be started. It may be in use by another app.',
    },
    startVideoFailedDismiss: {
        id: 'mobile.calls_start_video_failed_dismiss',
        defaultMessage: 'OK',
    },
});

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
    let videoStream: MediaStream | null = null;
    let videoTrack: MediaStreamTrack | null = null;

    // ID of the track currently registered with the peer's sender map. This is
    // NOT the same as videoTrack.id: RTCPeer keys its senders by track ID, and
    // replaceTrack(id, null) does not re-key, so the sender stays under the
    // stopped track's ID until a non-null track replaces it. getUserMedia hands
    // back a brand new track (new ID) on every start, so we must remember the
    // registered key separately or the second startVideo throws.
    let videoSenderTrackId: string | null = null;
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

    // Fully releases the camera device. Disabling the track is not enough:
    // the device stays open and the hardware indicator stays lit.
    const releaseVideoTrack = () => {
        videoTrack?.stop();

        // stop() closes the capture device; release() frees the native object.
        // Both are needed, matching how disconnect() tears down `streams`.
        videoTrack?.release?.();
        videoTrack = null;
        videoStream = null;
        setMyVideoURL('');
    };

    const startVideo = async () => {
        if (!peer || videoTrack) {
            return;
        }

        try {
            videoStream = await mediaDevices.getUserMedia({
                audio: false,
                video: {
                    facingMode: 'user',
                    width: {ideal: 1280},
                    height: {ideal: 720},
                    frameRate: {ideal: 30},
                },
            }) as MediaStream;
        } catch (err) {
            logError('calls: startVideo, unable to get camera:', getFullErrorMessage(err));
            Alert.alert(
                intl.formatMessage(messages.startVideoFailedTitle),
                intl.formatMessage(messages.startVideoFailedDescription),
                [{text: intl.formatMessage(messages.startVideoFailedDismiss)}],
            );
            return;
        }

        videoTrack = videoStream.getVideoTracks()[0];

        try {
            if (videoSenderTrackId) {
                // RTCPeer re-keys the sender to the new track's ID when the
                // replacement track is non-null.
                peer.replaceTrack(videoSenderTrackId, videoTrack);
            } else {
                peer.addTrack(videoTrack, videoStream, {encodings: videoEncodings});
            }
            videoSenderTrackId = videoTrack.id;
        } catch (err) {
            logError('calls: startVideo, error adding track:', getFullErrorMessage(err));

            // Drop the sender key as well. If replaceTrack was what threw, the
            // sender is not in a state we can trust; keeping the stale ID would
            // send every later startVideo straight back down this same failing
            // branch and the camera could never recover for the rest of the
            // call. Clearing it makes the next attempt fall back to addTrack.
            videoSenderTrackId = null;
            releaseVideoTrack();
            return;
        }

        setMyVideoURL(videoStream.toURL());

        if (ws) {
            ws.send('video_on', {
                data: JSON.stringify({videoStreamID: videoStream.id}),
            });
        }

        if (Platform.OS === 'android') {
            // Restart the foreground service holding the camera FGS type so
            // Android 14+ doesn't stop the capture when the app backgrounds.
            foregroundServiceStart(intl, true);
        }

        // Note: we deliberately do NOT force the audio route to speaker here.
        // There is no state in this codebase that distinguishes a route the
        // user picked (via the audio-device picker, which calls
        // setPreferredAudioRoute) from one that was merely defaulted to, so
        // switching routes on video start risks yanking a user off a
        // deliberately chosen Bluetooth or earpiece device. Leaving the
        // route untouched is the conservative choice here.

        // Note: this client does not manage the proximity sensor at all, so
        // there is nothing to change here to keep the screen awake while the
        // camera is on.
    };

    const stopVideo = () => {
        if (!peer || !videoTrack) {
            return;
        }

        // Keep the sender alive (videoSenderTrackId stays set) so restarting
        // video does not force a renegotiation. Note that replaceTrack with a
        // null track does NOT re-key the sender, so videoSenderTrackId keeps
        // pointing at the now-stopped track's ID -- which is exactly the key
        // the next startVideo has to use.
        if (videoSenderTrackId) {
            peer.replaceTrack(videoSenderTrackId, null);
        }

        if (ws) {
            ws.send('video_off');
        }

        releaseVideoTrack();

        if (Platform.OS === 'android') {
            // Drop the camera FGS type; keep the microphone one alive since
            // the call itself is still ongoing.
            foregroundServiceStart(intl, false);
        }
    };

    const switchCamera = () => {
        if (!videoTrack) {
            return;
        }

        // Local device swap only: no signalling, no renegotiation.
        (videoTrack as any)._switchCamera();
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

    let previousAvailableDevices: AudioDeviceType[] = [];
    let userSelectedRoute: AudioDeviceType | null = null;

    const getAutoRoute = (available: AudioDeviceType[]): AudioDeviceType => {
        if (available.includes(AudioDevice.Bluetooth)) {
            return AudioDevice.Bluetooth;
        }
        if (available.includes(AudioDevice.WiredHeadset)) {
            return AudioDevice.WiredHeadset;
        }
        return AudioDevice.Earpiece;
    };

    const setUserSelectedAudioRoute = (route: AudioDeviceType) => {
        userSelectedRoute = route;
    };

    const ws = new WebSocketClient(serverUrl, client.getWebSocketUrl(), credentials?.token);

    try {
        await CallsNative.startAudioSession();
    } catch (err) {
        throw new Error(`calls: failed to start audio session: ${getErrorMessage(err)}`);
    }

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
        releaseVideoTrack();
        videoSenderTrackId = null;

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

    // Reports whether the unmute actually went out: callers show us as live off the back of it, and
    // there is no voice track to enable if getUserMedia lost its race with the peer connection.
    const unmute = () => {
        if (!peer || !voiceTrack) {
            return false;
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
            return false;
        }

        voiceTrack.enabled = true;
        if (ws) {
            ws.send('unmute');
        }

        return true;
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
        audioRouteEvent?.remove();
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
            const isNewDevice = (d: AudioDeviceType) => !previousAvailableDevices.includes(d);
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

        peer.on('stream', (remoteStream: MediaStream, trackInfo?: TrackInfo) => {
            logDebug('calls: new remote stream received', remoteStream.id, 'type:', trackInfo?.type);

            streams.push(remoteStream);

            if (remoteStream.getVideoTracks().length === 0) {
                return;
            }

            if (!trackInfo) {
                // The media map arrives on the data channel and may be absent
                // entirely (older servers) or not yet decoded when ontrack
                // fires. Falling back to the pre-video behaviour keeps screen
                // share working instead of dropping the track for good.
                logWarning('calls: stream received with no track info, treating as screen share');
                setScreenShareURL(remoteStream.toURL());
                return;
            }

            switch (trackInfo.type) {
                case 'screen':
                    setScreenShareURL(remoteStream.toURL());
                    break;
                case 'video':
                    setVideoURL(trackInfo.sender_id, remoteStream.toURL());
                    break;
                default:
                    logDebug('calls: ignoring video track with unknown type', trackInfo.type);
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
        startVideo,
        stopVideo,
        switchCamera,
    };

    return connection;
}
