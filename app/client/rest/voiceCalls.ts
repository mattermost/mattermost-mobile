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
        const results: Dictionary<Call> = {};
        for (let i = 0; i < resp.length; i++) {
            const channel = resp[i];
            if (channel.call) {
                results[channel.channel_id] = {
                    participants: channel.call.users.reduce((prev: Dictionary<CallParticipant>, cur: string) => {
                        prev[cur] = {id: cur, muted: false, isTalking: false, handRaised: false};
                        return prev;
                    }, {}),
                    channelId: channel.channel_id,
                    startTime: channel.call.start_at,
                    speakers: [],
                };
            }
        }
        return results;
    }
};

export default ClientVoiceCalls;
