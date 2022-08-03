// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//
// Based on react-native-webrtc types from
// https://github.com/DefinitelyTyped/DefinitelyTyped
//
// Definitions by: Carlos Quiroga <https://github.com/KarlosQ>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// TypeScript Version: 2.8

declare module 'react-native-webrtc' {
    export const RTCView: any;
    export type RTCSignalingState =
        | 'stable'
        | 'have-local-offer'
        | 'have-remote-offer'
        | 'have-local-pranswer'
        | 'have-remote-pranswer'
        | 'closed';

    export type RTCIceGatheringState = 'new' | 'gathering' | 'complete';

    export type RTCIceConnectionState =
        | 'new'
        | 'checking'
        | 'connected'
        | 'completed'
        | 'failed'
        | 'disconnected'
        | 'closed';

    export type RTCPeerConnectionState = 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed';

    export class MediaStreamTrack {
        private _enabled: boolean;

        enabled: boolean;
        id: string;
        kind: string;
        label: string;
        muted: boolean;
        readonly: boolean;
        readyState: MediaStreamTrackState;
        remote: boolean;
        onended: () => void | undefined;
        onmute: () => void | undefined;
        onunmute: () => void | undefined;
        overconstrained: () => void | undefined;

        constructor();

        stop(): void;

        applyConstraints(): void;

        clone(): void;

        getCapabilities(): void;

        getConstraints(): void;

        getSettings(): void;

        release(): void;

        private _switchCamera(): void;
    }

    export class MediaStream {
        id: string;
        active: boolean;
        onactive: () => void | undefined;
        oninactive: () => void | undefined;
        onaddtrack: () => void | undefined;
        onremovetrack: () => void | undefined;

        _tracks: MediaStreamTrack[];
        private _reactTag: string;

        constructor(arg: any);

        addTrack(track: MediaStreamTrack): void;

        removeTrack(track: MediaStreamTrack): void;

        getTracks(): MediaStreamTrack[];

        getTrackById(trackId: string): MediaStreamTrack | undefined;

        getAudioTracks(): MediaStreamTrack[];

        getVideoTracks(): MediaStreamTrack[];

        clone(): void;

        toURL(): string;

        release(): void;
    }

    export class RTCDataChannel {
        _peerConnectionId: number;

        binaryType: 'arraybuffer';
        bufferedAmount: number;
        bufferedAmountLowThreshold: number;
        id: number;
        label: string;
        maxPacketLifeTime?: number;
        maxRetransmits?: number;
        negotiated: boolean;
        ordered: boolean;
        protocol: string;
        readyState: 'connecting' | 'open' | 'closing' | 'closed';

        onopen?: Function;
        onmessage?: Function;
        onbufferedamountlow?: Function;
        onerror?: Function;
        onclose?: Function;

        constructor(peerConnectionId: number, label: string, dataChannelDict: RTCDataChannelInit)

        send(data: string | ArrayBuffer | ArrayBufferView): void

        close(): void

        _unregisterEvents(): void

        _registerEvents(): void
    }

    export class MessageEvent {
        type: string;
        data: string | ArrayBuffer | Blob;
        origin: string;

        constructor(type: any, eventInitDict: any)
    }

    export interface EventOnCandidate {
        candidate: RTCIceCandidateType;
    }

    export interface EventOnAddStream {
        stream: MediaStream;
        target: RTCPeerConnection;
        track?: MediaStreamTrack;
    }

    export interface EventOnConnectionStateChange {
        target: {
            iceConnectionState: RTCIceConnectionState;
        };
    }

    export interface ConfigurationParam {
        username?: string | undefined;
        credential?: string | undefined;
    }

    export interface ConfigurationParamWithUrls extends ConfigurationParam {
        urls: string[];
    }

    export interface ConfigurationParamWithUrl extends ConfigurationParam {
        url: string;
    }

    export interface RTCPeerConnectionConfiguration {
        iceServers: ConfigurationParamWithUrls[] | ConfigurationParamWithUrl[];
        iceTransportPolicy?: 'all' | 'relay' | 'nohost' | 'none' | undefined;
        bundlePolicy?: 'balanced' | 'max-compat' | 'max-bundle' | undefined;
        rtcpMuxPolicy?: 'negotiate' | 'require' | undefined;
        iceCandidatePoolSize?: number | undefined;
    }

    export class RTCPeerConnection {
        localDescription: RTCSessionDescriptionType;
        remoteDescription: RTCSessionDescriptionType;
        connectionState: RTCPeerConnectionState;
        iceConnectionState: RTCIceConnectionState;
        iceGatheringState: RTCIceGatheringState;

        signalingState: RTCSignalingState;
        private privateiceGatheringState: RTCIceGatheringState;
        private privateiceConnectionState: RTCIceConnectionState;

        onconnectionstatechange: (event: Event) => void | undefined;
        onicecandidate: (event: EventOnCandidate) => void | undefined;
        onicecandidateerror: (error: Error) => void | undefined;
        oniceconnectionstatechange: (event: EventOnConnectionStateChange) => void | undefined;
        onicegatheringstatechange: () => void | undefined;
        onnegotiationneeded: () => void | undefined;
        onsignalingstatechange: () => void | undefined;

        onaddstream: (event: EventOnAddStream) => void | undefined;
        onremovestream: () => void | undefined;

        private _peerConnectionId: number;
        private _localStreams: MediaStream[];
        _remoteStreams: MediaStream[];
        private _subscriptions: any[];

        private _dataChannelIds: any;

        constructor(configuration: RTCPeerConnectionConfiguration);

        addStream(stream: MediaStream): void;

        addTrack(track: MediaStreamTrack): void;

        addTransceiver(kind: 'audio' | 'video' | MediaStreamTrack, init: any): void;

        removeStream(stream: MediaStream): void;

        removeTrack(sender: RTCRtpSender): Promise<boolean>

        createOffer(options?: RTCOfferOptions): Promise<RTCSessionDescriptionType>;

        createAnswer(options?: RTCAnswerOptions): Promise<RTCSessionDescriptionType>;

        setConfiguration(configuration: RTCPeerConnectionConfiguration): void;

        setLocalDescription(sessionDescription: RTCSessionDescriptionType): Promise<void>;

        setRemoteDescription(sessionDescription: RTCSessionDescriptionType): Promise<void>;

        addIceCandidate(candidate: RTCIceCandidateType): Promise<void>;

        getStats(selector?: MediaStreamTrack | null): Promise<any>;

        getLocalStreams(): MediaStream[];

        getRemoteStreams(): MediaStream[];

        close(cb?: () => void): void;

        private _getTrack(streamReactTag: string, trackId: string): MediaStreamTrack;

        private _unregisterEvents(): void;

        private _registerEvents(): void;

        createDataChannel(label: string, dataChannelDict?: any): RTCDataChannel;
    }

    export class RTCIceCandidateType {
        candidate: string;
        sdpMLineIndex: number;
        sdpMid: string;
    }

    export class RTCIceCandidate extends RTCIceCandidateType {
        constructor(info: RTCIceCandidateType);

        toJSON(): RTCIceCandidateType;
    }

    export class RTCSessionDescriptionType {
        sdp: string;
        type: string;
    }

    export class RTCSessionDescription extends RTCSessionDescriptionType {
        constructor(info: RTCSessionDescriptionType);

        toJSON(): RTCSessionDescriptionType;
    }

    export class mediaDevices {
        ondevicechange: () => void | undefined;

        static enumerateDevices(): Promise<any>;

        static getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream | boolean>;
    }
}
