// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {ServerChannelState, ServerConfig} from '@mmproducts/calls/store/types/calls';

export interface ClientCallsMix {
    getEnabled: () => Promise<Boolean>;
    getCalls: () => Promise<ServerChannelState[]>;
    getCallsConfig: () => Promise<ServerConfig>;
    enableChannelCalls: (channelId: string) => Promise<ServerChannelState>;
    disableChannelCalls: (channelId: string) => Promise<ServerChannelState>;
    endCall: (channelId: string) => Promise<any>;
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
        ) as ServerConfig;
    };

    enableChannelCalls = async (channelId: string) => {
        return this.doFetch(
            `${this.getCallsRoute()}/${channelId}`,
            {method: 'post', body: JSON.stringify({enabled: true})},
        );
    };

    disableChannelCalls = async (channelId: string) => {
        return this.doFetch(
            `${this.getCallsRoute()}/${channelId}`,
            {method: 'post', body: JSON.stringify({enabled: false})},
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
