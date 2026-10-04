// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Call, CallSession} from '@calls/types/calls';
import type {CallState} from '@mattermost/calls/lib/types';

export const createCallAndAddToIds = (channelId: string, call: CallState, ids?: Set<string>) => {
    // Don't cast so that we get alerted to missing types
    const convertedCall: Call = {
        sessions: Object.values(call.sessions).reduce((accum, cur) => {
            // Add the id to the set of UserModels we want to ensure are loaded.
            ids?.add(cur.user_id);

            // Create the CallParticipant
            accum[cur.session_id] = {
                userId: cur.user_id,
                sessionId: cur.session_id,
                raisedHand: cur.raised_hand || 0,
                muted: !cur.unmuted,
            };
            return accum;
        }, {} as Dictionary<CallSession>),
        channelId,
        id: call.id,
        startTime: call.start_at,
        screenOn: call.screen_sharing_session_id,
        threadId: call.thread_id,
        ownerId: call.owner_id,
        hostId: call.host_id,
        recState: call.recording,
        dismissed: call.dismissed_notification || {},
    };

    return convertedCall;
};
