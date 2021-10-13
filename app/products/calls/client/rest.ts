// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Dictionary} from '@mm-redux/types/utilities';

import type {Call, CallParticipant} from '@mmproducts/Calls/store/types/calls';

export interface ClientCallsMix {
    getCalls: () => Promise<Dictionary<Call>>;
}

const ClientCalls = (superclass: any) => class extends superclass {
    getCalls = async () => {
        const resp = await this.doFetch(
            `${this.getCallsRoute()}/channels`,
            {method: 'get'},
        );
        const callsResults: Dictionary<Call> = {};
        const enabledChannels: Dictionary<boolean> = {};
        for (let i = 0; i < resp.length; i++) {
            const channel = resp[i];
            if (channel.call) {
                callsResults[channel.channel_id] = {
                    participants: channel.call.users.reduce((prev: Dictionary<CallParticipant>, cur: string) => {
                        // TODO: Get the right value for muted
                        prev[cur] = {id: cur, muted: true, isTalking: false};
                        return prev;
                    }, {}),
                    channelId: channel.channel_id,
                    startTime: channel.call.start_at,
                    speakers: [],
                    screenOn: channel.call.screen_sharing_id,
                };
            }
            enabledChannels[channel.channel_id] = channel.enabled;
        }
        return {
            calls: callsResults,
            enabled: enabledChannels,
        };
    }

    enableChannelCalls = async (channelId: string) => {
        return this.doFetch(
            `${this.getCallsRoute()}/${channelId}`,
            {method: 'post', body: JSON.stringify({enabled: true})},
        );
    }

    disableChannelCalls = async (channelId: string) => {
        return this.doFetch(
            `${this.getCallsRoute()}/${channelId}`,
            {method: 'post', body: JSON.stringify({enabled: false})},
        );
    }
};

export default ClientCalls;
