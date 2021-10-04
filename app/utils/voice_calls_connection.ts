// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    RTCPeerConnection,
    RTCIceCandidate,
    RTCSessionDescription,
    MediaStream,
    MediaStreamTrack,
    mediaDevices,
} from 'react-native-webrtc';
import Peer from 'simple-peer';

import {Client4} from '@client/rest';

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
export async function newClient(channelID: string, closeCb: () => void) {
    let peer: any = null;
    const streams: MediaStream[] = [];

    const stream = await mediaDevices.getUserMedia({
        video: false,
        audio: true,
    }) as MediaStream;

    const audioTrack = stream.getAudioTracks()[0];
    audioTrack.enabled = true;
    streams.push(stream);

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

    const getStreams = () => {
        return streams;
    };

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

        if (closeCb) {
            closeCb();
        }
    };

    const mute = () => {
        // if (voiceDetector) {
        //     voiceDetector.stop();
        // }

        audioTrack.enabled = true;
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

    // ws.onerror = (err) => console.log(err);

    ws.onopen = () => {
        peer = new Peer({
            initiator: true,
            stream,
            trickle: true,
            wrtc: {
                RTCPeerConnection,
                RTCIceCandidate,
                RTCSessionDescription,
            },
        });
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

        // peer.on('error', (err: any) => console.log(err));
        peer.on('stream', (remoteStream: MediaStream) => {
            streams.push(remoteStream);
        });

        ws.onmessage = ({data}) => {
            // console.log('ws', data);
            const msg = JSON.parse(data);
            if (msg.type === 'answer' || msg.type === 'offer') {
                peer.signal(data);
            }
        };
    };

    client = {
        getStreams,
        disconnect,
        mute,
        unmute,
    };
    return client;
}
