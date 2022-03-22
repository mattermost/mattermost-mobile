// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Dictionary} from '@mm-redux/types/utilities';
import {CallParticipant} from '@mmproducts/calls/store/types/calls';

export function sortParticipants(participants?: Dictionary<CallParticipant>): CallParticipant[] {
    if (!participants) {
        return [];
    }

    const users = Object.values(participants);

    return users.sort((a, b) => {
        if (!a.muted && b.muted) {
            return -1;
        } else if (!b.muted && a.muted) {
            return 1;
        }

        if (a.raisedHand && !b.raisedHand) {
            return -1;
        } else if (b.raisedHand && !a.raisedHand) {
            return 1;
        } else if (a.raisedHand && b.raisedHand) {
            return a.raisedHand - b.raisedHand;
        }

        return 0;
    });
}
