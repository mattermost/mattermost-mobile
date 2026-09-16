// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {EventOnCandidate, EventOnConnectionStateChange, RTCIceCandidate} from '@livekit/react-native-webrtc';
import RTCTrackEvent from '@livekit/react-native-webrtc/lib/typescript/RTCTrackEvent';

// Only adding the types that are not included in the imported module.
declare module '@livekit/react-native-webrtc' {
    export type RTCIceCredentialType = 'password';

    export interface RTCIceServer {
        credential?: string;
        credentialType?: RTCIceCredentialType;
        urls: string | string[];
        username?: string;
    }

    export interface RTCPeerConnectionIceEvent extends Event {
        readonly candidate: RTCIceCandidate | null;
    }

    export class RTCPeerConnection {
        onconnectionstatechange?: ((event: Event) => void) | null;
        onnegotiationneeded?: (() => void | Promise<void>) | null;
        onicecandidate?: ((event: EventOnCandidate) => void) | null;
        oniceconnectionstatechange?: ((event: EventOnConnectionStateChange) => void) | null;
        ontrack?: ((event: RTCTrackEvent) => void) | null;
    }
}
