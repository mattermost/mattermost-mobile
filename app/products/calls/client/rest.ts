// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {ServerChannelState, ServerCallsConfig, ApiResp, ICEServersConfigs} from '@calls/types/calls';

export interface ClientCallsMix {
    getEnabled: () => Promise<Boolean>;
    getCalls: () => Promise<ServerChannelState[]>;
    getCallsConfig: () => Promise<ServerCallsConfig>;
    enableChannelCalls: (channelId: string, enable: boolean) => Promise<ServerChannelState>;
    endCall: (channelId: string) => Promise<ApiResp>;
    genTURNCredentials: () => Promise<ICEServersConfigs>;
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
            `${this.getCallsRoute()}/channels`,
            {method: 'get'},
        );
    };

    getCallsConfig = async () => {
        return this.doFetch(
            `${this.getCallsRoute()}/config`,
            {method: 'get'},
        ) as ServerCallsConfig;
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
};

export default ClientCalls;
