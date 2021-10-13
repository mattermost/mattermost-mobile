// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import InCallManager from 'react-native-incall-manager';
import {
    MediaStream,
    MediaStreamTrack,
    mediaDevices,
} from 'react-native-webrtc2';

import {Client4} from '@client/rest';

import Peer from './simple-peer';

// TODO: Enable voice detector
// import VoiceActivityDetector from './voice_calls_activity_detector';

export let client: any = null;

function getWSConnectionURL(channelID: string): string {
    let url = Client4.getAbsoluteUrl(`/plugins/com.mattermost.calls/${channelID}/ws`);
    url = url.replace(/^https:/, 'wss:');
    url = url.replace(/^http:/, 'ws:');
    return url;
}

// TODO: Maybe convert this to a component
export async function newClient(channelID: string, closeCb: () => void, setScreenShareURL: (url: string) => void) {
    let peer: any = null;
    const streams: MediaStream[] = [];

    let stream: MediaStream;
    try {
        stream = await mediaDevices.getUserMedia({
            video: false,
            audio: true,
        }) as MediaStream;
    } catch (err) {
        // TODO: handle the error
        // console.log(err);
        return {
            disconnect: () => null,
            mute: () => null,
            unmute: () => null,
        };
    }

    const audioTrack = stream.getAudioTracks()[0];
    audioTrack.enabled = false;
    streams.push(stream);

    // alert(JSON.stringify(mediaDevices.enumerateDevices()))

    // const AudioContext = window.AudioContext || window.webkitAudioContext;
    // if (!AudioContext) {
    //     throw new Error('AudioCtx unsupported');
    // }
    // const audioCtx = new AudioContext();
    // const voiceDetector = new VoiceActivityDetector(audioCtx, stream);

    const ws = new WebSocket(getWSConnectionURL(channelID));

    // voiceDetector.on('start', () => {
    //     if (ws) {
    //         ws.send(JSON.stringify({
    //             type: 'voice_on',
    //         }));
    //     }
    // });
    // voiceDetector.on('stop', () => {
    //     if (ws) {
    //         ws.send(JSON.stringify({
    //             type: 'voice_off',
    //         }));
    //     }
    // });

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
        // if (voiceDetector) {
        //     voiceDetector.stop();
        // }

        audioTrack.enabled = false;
        if (ws) {
            ws.send(JSON.stringify({
                type: 'mute',
            }));
        }
    };

    const unmute = () => {
        // if (voiceDetector) {
        //     voiceDetector.start();
        // }

        audioTrack.enabled = true;
        if (ws) {
            ws.send(JSON.stringify({
                type: 'unmute',
            }));
        }
    };

    ws.onerror = (err) => console.log('WS ERROR', err); // eslint-disable-line no-console

    ws.onopen = async () => {
        InCallManager.start({media: 'audio'});
        peer = new Peer(stream);
        peer.on('signal', (data: any) => {
            if (data.type === 'offer' || data.type === 'answer') {
                ws.send(JSON.stringify({
                    type: 'signal',
                    data,
                }));
            } else if (data.type === 'candidate') {
                ws.send(JSON.stringify({
                    type: 'ice',
                    data,
                }));
            }
        });

        peer.on('stream', (remoteStream: MediaStream) => {
            streams.push(remoteStream);
            if (remoteStream.getVideoTracks().length > 0) {
                setScreenShareURL(remoteStream.toURL());
            }
        });

        peer.on('error', (err: any) => console.log('PEER ERROR', err)); // eslint-disable-line no-console

        ws.onmessage = ({data}) => {
            const msg = JSON.parse(data);
            if (msg.type === 'answer' || msg.type === 'offer') {
                peer.signal(data);
            }
        };
    };

    client = {
        disconnect,
        mute,
        unmute,
    };
    return client;
}
