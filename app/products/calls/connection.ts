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

import {Client4} from '@client/rest';
import {WebsocketEvents} from '@constants';
import {ICEServersConfigs} from '@mmproducts/calls/store/types/calls';

import Peer from './simple-peer';
import WebSocketClient from './websocket';

export let client: any = null;

const websocketConnectTimeout = 3000;

export async function newClient(channelID: string, iceServers: ICEServersConfigs, closeCb: () => void, setScreenShareURL: (url: string) => void) {
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
        console.log('Unable to get media device:', err); // eslint-disable-line no-console
    }

    const ws = new WebSocketClient(Client4.getWebSocketUrl(), Client4.getToken());

    const disconnect = () => {
        if (!isClosed) {
            ws.close();
        }

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

    onCallEnd = DeviceEventEmitter.addListener(WebsocketEvents.CALLS_CALL_END, ({channelId}) => {
        if (channelId === channelID) {
            disconnect();
        }
    });

    const mute = () => {
        if (!peer) {
            return;
        }
        if (voiceTrackAdded && voiceTrack) {
            peer.replaceTrack(voiceTrack, null, stream);
        }
        if (voiceTrack) {
            voiceTrack.enabled = false;
        }
        if (ws) {
            ws.send('mute');
        }
    };

    const unmute = () => {
        if (!peer || !voiceTrack) {
            return;
        }
        if (voiceTrackAdded) {
            peer.replaceTrack(voiceTrack, voiceTrack, stream);
        } else {
            peer.addStream(stream);
            voiceTrackAdded = true;
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

    ws.on('error', (err) => {
        console.log('WS (CALLS) ERROR', err); // eslint-disable-line no-console
        ws.close();
    });

    ws.on('close', () => {
        isClosed = true;
        disconnect();
    });

    ws.on('join', async () => {
        InCallManager.start({media: 'audio'});
        peer = new Peer(null, iceServers);
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
            console.log('PEER ERROR', err); // eslint-disable-line no-console
        });
    });

    ws.on('open', async () => {
        ws.send('join', {
            channelID,
        });
    });

    ws.on('message', ({data}) => {
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

    client = {
        disconnect,
        mute,
        unmute,
        waitForReady,
        raiseHand,
        unraiseHand,
    };

    return client;
}
