// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Dictionary} from '@mm-redux/types/utilities';

import type {Call, CallParticipant} from '@mm-redux/types/voiceCalls';

export interface ClientVoiceCallsMix {
    getVoiceCalls: () => Promise<Dictionary<Call>>;
}

const ClientVoiceCalls = (superclass: any) => class extends superclass {
    getVoiceCalls = async () => {
        const resp = await this.doFetch(
            `${this.getVoiceCallsRoute()}/channels`,
            {method: 'get'},
        );
        const callsResults: Dictionary<Call> = {};
        const enabledChannels: Dictionary<boolean> = {};
        for (let i = 0; i < resp.length; i++) {
            const channel = resp[i];
            if (channel.call) {
                callsResults[channel.channel_id] = {
                    participants: channel.call.users.reduce((prev: Dictionary<CallParticipant>, cur: string) => {
                        prev[cur] = {id: cur, muted: false, isTalking: false, handRaised: false};
                        return prev;
                    }, {}),
                    channelId: channel.channel_id,
                    startTime: channel.call.start_at,
                    speakers: [],
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
            `${this.getVoiceCallsRoute()}/${channelId}`,
            {method: 'post', body: JSON.stringify({enabled: true})},
        );
    }

    disableChannelCalls = async (channelId: string) => {
        return this.doFetch(
            `${this.getVoiceCallsRoute()}/${channelId}`,
            {method: 'post', body: JSON.stringify({enabled: false})},
        );
    }
};

export default ClientVoiceCalls;
