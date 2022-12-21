// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable @typescript-eslint/ban-ts-comment */

import {EventEmitter} from 'events';

import {
    MediaStream,
    MediaStreamTrack,
    RTCPeerConnection,
    RTCPeerConnectionIceEvent,
    RTCRtpSender,
    RTCSessionDescription,
} from 'react-native-webrtc';
import RTCTrackEvent from 'react-native-webrtc/lib/typescript/RTCTrackEvent';

import {RTCPeerConfig} from './types';

const rtcConnFailedErr = new Error('rtc connection failed');

export default class RTCPeer extends EventEmitter {
    private pc: RTCPeerConnection | null;
    private readonly senders: { [key: string]: RTCRtpSender };
    private destroyCb?: () => void;

    public connected: boolean;

    private readonly sessionConstraints = {
        mandatory: {
            OfferToReceiveAudio: true,
            OfferToReceiveVideo: true,
        },
    };

    constructor(config: RTCPeerConfig, destroyCb?: () => void) {
        super();

        // We keep a map of track IDs -> RTP sender so that we can easily
        // replace tracks when muting/unmuting.
        this.senders = {};

        this.pc = new RTCPeerConnection(config);
        this.pc.onnegotiationneeded = () => this.onNegotiationNeeded();
        this.pc.onicecandidate = (ev) => this.onICECandidate(ev);
        this.pc.oniceconnectionstatechange = () => this.onICEConnectionStateChange();
        this.pc.onconnectionstatechange = () => this.onConnectionStateChange();
        this.pc.ontrack = (ev) => this.onTrack(ev);

        this.connected = false;
        this.destroyCb = destroyCb;

        // We create a data channel for two reasons:
        // - Initiate a connection without preemptively adding audio/video tracks.
        // - Use this communication channel for further negotiation (to be implemented).
        this.pc.createDataChannel('calls-dc');
    }

    private onICECandidate(ev: RTCPeerConnectionIceEvent) {
        if (ev.candidate) {
            this.emit('candidate', ev.candidate);
        }
    }

    private onConnectionStateChange() {
        switch (this.pc?.connectionState) {
            case 'connected':
                this.connected = true;
                break;
            case 'failed':
                this.emit('close', rtcConnFailedErr);
                break;
        }
    }

    private onICEConnectionStateChange() {
        switch (this.pc?.iceConnectionState) {
            case 'connected':
                this.emit('connect');
                break;
            case 'failed':
                this.emit('close', rtcConnFailedErr);
                break;
            case 'closed':
                this.emit('close');
                break;
            default:
        }
    }

    private async onNegotiationNeeded() {
        try {
            const desc = await this.pc?.createOffer(this.sessionConstraints) as RTCSessionDescription;
            await this.pc?.setLocalDescription(desc);
            this.emit('offer', this.pc?.localDescription);
        } catch (err) {
            this.emit('error', err);
        }
    }

    private onTrack(ev: RTCTrackEvent) {
        if (ev.streams.length === 0) {
            this.emit('stream', new MediaStream([ev.track]));
            return;
        }
        this.emit('stream', ev.streams[0]);
    }

    public async signal(data: string) {
        if (!this.pc) {
            throw new Error('peer has been destroyed');
        }

        const msg = JSON.parse(data);

        try {
            switch (msg.type) {
                case 'candidate':
                    await this.pc.addIceCandidate(msg.candidate);
                    break;
                case 'offer':
                    await this.pc.setRemoteDescription(new RTCSessionDescription(msg));
                    await this.pc.setLocalDescription(await this.pc.createAnswer() as RTCSessionDescription);
                    this.emit('answer', this.pc.localDescription);
                    break;
                case 'answer':
                    await this.pc.setRemoteDescription(msg);
                    break;
                default:
                    this.emit('error', Error('invalid signaling data received'));
            }
        } catch (err) {
            this.emit('error', err);
        }
    }

    public async addTrack(track: MediaStreamTrack, stream?: MediaStream) {
        if (!this.pc) {
            throw new Error('peer has been destroyed');
        }
        const sender = await this.pc.addTrack(track, stream!);
        if (sender) {
            this.senders[track.id] = sender;
        }
    }

    public addStream(stream: MediaStream) {
        stream.getTracks().forEach((track) => {
            this.addTrack(track, stream);
        });
    }

    public replaceTrack(oldTrackID: string, newTrack: MediaStreamTrack | null) {
        const sender = this.senders[oldTrackID];
        if (!sender) {
            throw new Error('sender for track not found');
        }
        if (newTrack && newTrack.id !== oldTrackID) {
            delete this.senders[oldTrackID];
            this.senders[newTrack.id] = sender;
        }
        sender.replaceTrack(newTrack);
    }

    public getStats() {
        if (!this.pc) {
            throw new Error('peer has been destroyed');
        }
        return this.pc.getStats();
    }

    public destroy() {
        if (!this.pc) {
            throw new Error('peer has been destroyed already');
        }

        this.removeAllListeners('candidate');
        this.removeAllListeners('connect');
        this.removeAllListeners('error');
        this.removeAllListeners('close');
        this.removeAllListeners('offer');
        this.removeAllListeners('answer');
        this.removeAllListeners('stream');
        this.pc.onnegotiationneeded = null;
        this.pc.onicecandidate = null;
        this.pc.oniceconnectionstatechange = null;
        this.pc.onconnectionstatechange = null;
        this.pc.ontrack = null;
        this.pc.close();
        this.pc = null;
        this.connected = false;
        this.destroyCb?.();
    }
}
