// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {ServerChannelState, ApiResp} from '@calls/types/calls';
import type {CallRecordingState, CallsConfig} from '@mattermost/calls/lib/types';
import type {RTCIceServer} from 'react-native-webrtc';

export interface ClientCallsMix {
    getEnabled: () => Promise<Boolean>;
    getCalls: () => Promise<ServerChannelState[]>;
    getCallForChannel: (channelId: string) => Promise<ServerChannelState>;
    getCallsConfig: () => Promise<CallsConfig>;
    enableChannelCalls: (channelId: string, enable: boolean) => Promise<ServerChannelState>;
    endCall: (channelId: string) => Promise<ApiResp>;
    genTURNCredentials: () => Promise<RTCIceServer[]>;
    startCallRecording: (callId: string) => Promise<ApiResp | CallRecordingState>;
    stopCallRecording: (callId: string) => Promise<ApiResp | CallRecordingState>;
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
};

export default ClientCalls;
