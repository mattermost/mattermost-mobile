// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import {deflate} from 'pako/lib/deflate.js';
import {DeviceEventEmitter, EmitterSubscription} from 'react-native';
import InCallManager from 'react-native-incall-manager';
import {
    MediaStream,
    MediaStreamTrack,
    mediaDevices,
} from 'react-native-webrtc';

import {getICEServersConfigs} from '@calls/utils';
import {WebsocketEvents} from '@constants';
import {getServerCredentials} from '@init/credentials';
import NetworkManager from '@managers/network_manager';
import {logError, logDebug, logWarning} from '@utils/log';

import Peer from './simple-peer';
import {WebSocketClient, wsReconnectionTimeoutErr} from './websocket_client';

import type {CallsConnection} from '@calls/types/calls';

const websocketConnectTimeout = 3000;

export async function newConnection(serverUrl: string, channelID: string, closeCb: () => void, setScreenShareURL: (url: string) => void) {
    let peer: Peer | null = null;
    let stream: MediaStream;
    let voiceTrackAdded = false;
    let voiceTrack: MediaStreamTrack | null = null;
    let isClosed = false;
    let onCallEnd: EmitterSubscription | null = null;
    const streams: MediaStream[] = [];

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

    // getClient can throw an error, which will be handled by the caller.
    const client = NetworkManager.getClient(serverUrl);

    const credentials = await getServerCredentials(serverUrl);

    const ws = new WebSocketClient(serverUrl, client.getWebSocketUrl(), credentials?.token);

    // Throws an error, to be caught by caller.
    await ws.initialize();

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

        peer?.destroy(undefined, undefined, () => {
            // Wait until the peer connection is closed, which avoids the following racy error that can cause problems with accessing the audio system in the future:
            // AVAudioSession_iOS.mm:1243  Deactivating an audio session that has running I/O. All I/O should be stopped or paused prior to deactivating the audio session.
            InCallManager.stop();
        });

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
        if (!peer || peer.destroyed) {
            return;
        }

        try {
            if (voiceTrackAdded && voiceTrack) {
                peer.replaceTrack(voiceTrack, null, stream);
            }
        } catch (e) {
            logError('From simple-peer:', e);
            return;
        }

        if (voiceTrack) {
            voiceTrack.enabled = false;
        }
        if (ws) {
            ws.send('mute');
        }
    };

    const unmute = () => {
        if (!peer || !voiceTrack || peer.destroyed) {
            return;
        }

        try {
            if (voiceTrackAdded) {
                peer.replaceTrack(voiceTrack, voiceTrack, stream);
            } else {
                peer.addStream(stream);
                voiceTrackAdded = true;
            }
        } catch (e) {
            logError('From simple-peer:', e);
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

        InCallManager.start({media: 'audio'});
        InCallManager.stopProximitySensor();
        peer = new Peer(null, iceConfigs);
        peer.on('signal', (data: any) => {
            if (data.type === 'offer' || data.type === 'answer') {
                ws.send('sdp', {
                    data: deflate(JSON.stringify(data)),
                }, true);
            } else if (data.type === 'candidate') {
                ws.send('ice', {
                    data: JSON.stringify(data.candidate),
                });
            }
        });

        peer.on('stream', (remoteStream: MediaStream) => {
            streams.push(remoteStream);
            if (remoteStream.getVideoTracks().length > 0) {
                setScreenShareURL(remoteStream.toURL());
            }
        });

        peer.on('error', (err: any) => {
            logError('calls: peer error:', err);
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
            });
        }
    });

    ws.on('message', ({data}: { data: string }) => {
        const msg = JSON.parse(data);
        if (msg.type === 'answer' || msg.type === 'offer') {
            peer?.signal(data);
        }
    });

    const waitForReady = () => {
        const waitForReadyImpl = (callback: () => void, fail: () => void, timeout: number) => {
            if (timeout <= 0) {
                fail();
                return;
            }
            setTimeout(() => {
                if (ws.state() === WebSocket.OPEN) {
                    callback();
                } else {
                    waitForReadyImpl(callback, fail, timeout - 10);
                }
            }, 10);
        };

        const promise = new Promise<void>((resolve, reject) => {
            waitForReadyImpl(resolve, reject, websocketConnectTimeout);
        });

        return promise;
    };

    const connection = {
        disconnect,
        mute,
        unmute,
        waitForReady,
        raiseHand,
        unraiseHand,
    } as CallsConnection;

    return connection;
}
