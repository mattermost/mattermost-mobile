// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {ApiResp, CallsVersion} from '@calls/types/calls';
import type {CallChannelState, CallJobState, CallsConfig} from '@mattermost/calls/lib/types';
import type {RTCIceServer} from 'react-native-webrtc';

export interface ClientCallsMix {
    getEnabled: () => Promise<Boolean>;
    getCalls: () => Promise<CallChannelState[]>;
    getCallForChannel: (channelId: string) => Promise<CallChannelState>;
    getCallsConfig: () => Promise<CallsConfig>;
    getVersion: () => Promise<CallsVersion>;
    enableChannelCalls: (channelId: string, enable: boolean) => Promise<CallChannelState>;
    endCall: (channelId: string) => Promise<ApiResp>;
    genTURNCredentials: () => Promise<RTCIceServer[]>;
    startCallRecording: (callId: string) => Promise<ApiResp | CallJobState>;
    stopCallRecording: (callId: string) => Promise<ApiResp | CallJobState>;
    dismissCall: (channelId: string) => Promise<ApiResp>;
    hostMake: (callId: string, newHostId: string) => Promise<ApiResp>;
    hostMute: (callId: string, sessionId: string) => Promise<ApiResp>;
    hostMuteOthers: (callId: string) => Promise<ApiResp>;
    hostScreenOff: (callId: string, sessionId: string) => Promise<ApiResp>;
    hostLowerHand: (callId: string, sessionId: string) => Promise<ApiResp>;
    hostRemove: (callId: string, sessionId: string) => Promise<ApiResp>;
}

const ClientCalls = (superclass: any) => class extends superclass {
    getEnabled = async () => {
        try {
            await this.doFetch(
                `${this.getCallsRoute()}/version`,
                {method: 'get'},
            );
            return true;
        } catch (e) {
            return false;
        }
    };

    getCalls = async () => {
        return this.doFetch(
            `${this.getCallsRoute()}/channels?mobilev2=true`,
            {method: 'get'},
        );
    };

    getCallForChannel = async (channelId: string) => {
        return this.doFetch(
            `${this.getCallsRoute()}/${channelId}?mobilev2=true`,
            {method: 'get'},
        );
    };

    getCallsConfig = async () => {
        return this.doFetch(
            `${this.getCallsRoute()}/config`,
            {method: 'get'},
        ) as CallsConfig;
    };

    getVersion = async () => {
        try {
            return this.doFetch(
                `${this.getCallsRoute()}/version`,
                {method: 'get'},
            );
        } catch (e) {
            return {};
        }
    };

    enableChannelCalls = async (channelId: string, enable: boolean) => {
        return this.doFetch(
            `${this.getCallsRoute()}/${channelId}`,
            {method: 'post', body: {enabled: enable}},
        );
    };

    endCall = async (channelId: string) => {
        return this.doFetch(
            `${this.getCallsRoute()}/calls/${channelId}/end`,
            {method: 'post'},
        );
    };

    genTURNCredentials = async () => {
        return this.doFetch(
            `${this.getCallsRoute()}/turn-credentials`,
            {method: 'get'},
        );
    };

    startCallRecording = async (callID: string) => {
        return this.doFetch(
            `${this.getCallsRoute()}/calls/${callID}/recording/start`,
            {method: 'post'},
        );
    };

    stopCallRecording = async (callID: string) => {
        return this.doFetch(
            `${this.getCallsRoute()}/calls/${callID}/recording/stop`,
            {method: 'post'},
        );
    };

    dismissCall = async (channelID: string) => {
        return this.doFetch(
            `${this.getCallsRoute()}/calls/${channelID}/dismiss-notification`,
            {method: 'post'},
        );
    };

    hostMake = async (callId: string, newHostId: string) => {
        return this.doFetch(
            `${this.getCallsRoute()}/calls/${callId}/host/make`,
            {
                method: 'post',
                body: {new_host_id: newHostId},
            },
        );
    };

    hostMute = async (callId: string, sessionId: string) => {
        return this.doFetch(
            `${this.getCallsRoute()}/calls/${callId}/host/mute`,
            {
                method: 'post',
                body: {session_id: sessionId},
            },
        );
    };

    hostMuteOthers = async (callId: string) => {
        return this.doFetch(
            `${this.getCallsRoute()}/calls/${callId}/host/mute-others`,
            {method: 'post'},
        );
    };

    hostScreenOff = async (callId: string, sessionId: string) => {
        return this.doFetch(
            `${this.getCallsRoute()}/calls/${callId}/host/screen-off`,
            {
                method: 'post',
                body: {session_id: sessionId},
            },
        );
    };

    hostLowerHand = async (callId: string, sessionId: string) => {
        return this.doFetch(
            `${this.getCallsRoute()}/calls/${callId}/host/lower-hand`,
            {
                method: 'post',
                body: {session_id: sessionId},
            },
        );
    };

    hostRemove = async (callId: string, sessionId: string) => {
        return this.doFetch(
            `${this.getCallsRoute()}/calls/${callId}/host/remove`,
            {
                method: 'post',
                body: {session_id: sessionId},
            },
        );
    };
};

export default ClientCalls;
