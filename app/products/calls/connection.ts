// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import {deflate} from 'pako/lib/deflate.js';
import InCallManager from 'react-native-incall-manager';
import {
    MediaStream,
    MediaStreamTrack,
    mediaDevices,
} from 'react-native-webrtc';

import {Client4} from '@client/rest';

import Peer from './simple-peer';
import WebSocketClient from './websocket';

export let client: any = null;

const websocketConnectTimeout = 3000;

export async function newClient(channelID: string, closeCb: () => void, setScreenShareURL: (url: string) => void) {
    let peer: any = null;
    const streams: MediaStream[] = [];

    let stream: MediaStream;
    let audioTrack: any;
    try {
        stream = await mediaDevices.getUserMedia({
            video: false,
            audio: true,
        }) as MediaStream;
        audioTrack = stream.getAudioTracks()[0];
        audioTrack.enabled = false;
        streams.push(stream);
    } catch (err) {
        console.log('Unable to get media device:', err); // eslint-disable-line no-console
    }

    const ws = new WebSocketClient(Client4.getWebSocketUrl());

    const disconnect = () => {
        ws.close();

        streams.forEach((s) => {
            s.getTracks().forEach((track: MediaStreamTrack) => {
                track.stop();
            });
        });

        if (peer) {
            peer.destroy();
        }
        InCallManager.stop();

        if (closeCb) {
            closeCb();
        }
    };

    const mute = () => {
        if (audioTrack) {
            audioTrack.enabled = false;
        }
        if (ws) {
            ws.send('mute');
        }
    };

    const unmute = () => {
        if (audioTrack) {
            audioTrack.enabled = true;
        }
        if (ws) {
            ws.send('unmute');
        }
    };

    ws.on('error', (err) => console.log('WS ERROR', err)); // eslint-disable-line no-console

    ws.on('open', async () => {
        ws.send('join', {
            channelID,
        });

        let config;
        try {
            config = await Client4.getCallsConfig();
        } catch (err) {
            console.log('ERROR FETCHING CONFIG:', err); // eslint-disable-line no-console
            return;
        }

        InCallManager.start({media: 'audio'});
        peer = new Peer(stream, config.ICEServers);
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

        peer.on('error', (err: any) => console.log('PEER ERROR', err)); // eslint-disable-line no-console

        ws.on('message', ({data}) => {
            const msg = JSON.parse(data);
            if (msg.type === 'answer' || msg.type === 'offer') {
                peer.signal(data);
            }
        });
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
    };

    return client;
}
