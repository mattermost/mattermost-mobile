// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export interface ClientCallsMix {
    getCalls: () => Promise<any>;
    enableChannelCalls: (channelId: string) => Promise<any>;
    disableChannelCalls: (channelId: string) => Promise<any>;
}

const ClientCalls = (superclass: any) => class extends superclass {
    getCalls = async () => {
        return this.doFetch(
            `${this.getCallsRoute()}/channels`,
            {method: 'get'},
        );
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
};

export default ClientCalls;
