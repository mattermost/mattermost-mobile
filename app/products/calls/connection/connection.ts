// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {RTCPeer} from '@mattermost/calls/lib';
import {deflate} from 'pako';
import {DeviceEventEmitter, EmitterSubscription} from 'react-native';
import InCallManager from 'react-native-incall-manager';
import {
    MediaStream,
    MediaStreamTrack,
    mediaDevices,
    RTCPeerConnection,
} from 'react-native-webrtc';

import {setSpeakerPhone} from '@calls/state';
import {getICEServersConfigs} from '@calls/utils';
import {WebsocketEvents} from '@constants';
import {getServerCredentials} from '@init/credentials';
import NetworkManager from '@managers/network_manager';
import {logError, logDebug, logWarning, logInfo} from '@utils/log';

import {WebSocketClient, wsReconnectionTimeoutErr} from './websocket_client';

import type {CallsConnection} from '@calls/types/calls';
import type {EmojiData} from '@mattermost/calls/lib/types';

const peerConnectTimeout = 5000;

export async function newConnection(
    serverUrl: string,
    channelID: string,
    closeCb: () => void,
    setScreenShareURL: (url: string) => void,
    hasMicPermission: boolean,
    title?: string,
) {
    let peer: RTCPeer | null = null;
    let stream: MediaStream;
    let voiceTrackAdded = false;
    let voiceTrack: MediaStreamTrack | null = null;
    let isClosed = false;
    let onCallEnd: EmitterSubscription | null = null;
    const streams: MediaStream[] = [];

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
            logError('Unable to get media device:', err);
        }
    };

    // getClient can throw an error, which will be handled by the caller.
    const client = NetworkManager.getClient(serverUrl);
    const credentials = await getServerCredentials(serverUrl);

    const ws = new WebSocketClient(serverUrl, client.getWebSocketUrl(), credentials?.token);

    // Throws an error, to be caught by caller.
    await ws.initialize();

    if (hasMicPermission) {
        initializeVoiceTrack();
    }

    const disconnect = () => {
        if (isClosed) {
            return;
        }
        isClosed = true;

        ws.send('leave');
        ws.close();

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

        if (closeCb) {
            closeCb();
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
            logError('From RTCPeer:', e);
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

        try {
            if (voiceTrackAdded) {
                peer.replaceTrack(voiceTrack.id, voiceTrack);
            } else {
                peer.addStream(stream);
                voiceTrackAdded = true;
            }
        } catch (e) {
            logError('From RTCPeer:', e);
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

    ws.on('error', (err: Event) => {
        logDebug('calls: ws error', err);
        if (err === wsReconnectionTimeoutErr) {
            disconnect();
        }
    });

    ws.on('close', () => {
        logDebug('calls: ws close');
    });

    ws.on('join', async () => {
        let config;
        try {
            config = await client.getCallsConfig();
        } catch (err) {
            logError('FETCHING CALLS CONFIG:', err);
            return;
        }

        const iceConfigs = getICEServersConfigs(config);
        if (config.NeedsTURNCredentials) {
            try {
                iceConfigs.push(...await client.genTURNCredentials());
            } catch (err) {
                logWarning('failed to fetch TURN credentials:', err);
            }
        }

        InCallManager.start({media: 'video'});
        setSpeakerPhone(true);

        peer = new RTCPeer({
            iceServers: iceConfigs || [],
            logger: {
                logDebug,
                logErr: logError,
                logWarn: logWarning,
                logInfo,
            },
            webrtc: {
                MediaStream,
                RTCPeerConnection,
            },
        });

        peer.on('offer', (sdp) => {
            logDebug(`local offer, sending: ${JSON.stringify(sdp)}`);
            ws.send('sdp', {
                data: deflate(JSON.stringify(sdp)),
            }, true);
        });

        peer.on('answer', (sdp) => {
            logDebug(`local answer, sending: ${JSON.stringify(sdp)}`);
            ws.send('sdp', {
                data: deflate(JSON.stringify(sdp)),
            }, true);
        });

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
            logDebug('new remote stream received', remoteStream.id);
            for (const track of remoteStream.getTracks()) {
                logDebug('remote track', track.id);
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

    ws.on('open', (originalConnID: string, prevConnID: string, isReconnect: boolean) => {
        if (isReconnect) {
            logDebug('calls: ws reconnect, sending reconnect msg');
            ws.send('reconnect', {
                channelID,
                originalConnID,
                prevConnID,
            });
        } else {
            ws.send('join', {
                channelID,
                title,
            });
        }
    });

    ws.on('message', ({data}: { data: string }) => {
        const msg = JSON.parse(data);
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
