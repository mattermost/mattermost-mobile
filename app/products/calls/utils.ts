// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Dictionary} from '@mm-redux/types/utilities';
import {displayUsername} from '@mm-redux/utils/user_utils';
import {CallParticipant} from '@mmproducts/calls/store/types/calls';

export function sortParticipants(teammateNameDisplay: string, participants?: Dictionary<CallParticipant>, presenterID?: string): CallParticipant[] {
    if (!participants) {
        return [];
    }

    const users = Object.values(participants);

    return users.sort(sortByName(teammateNameDisplay)).sort(sortByState(presenterID));
}

const sortByName = (teammateNameDisplay: string) => {
    return (a: CallParticipant, b: CallParticipant) => {
        const nameA = displayUsername(a.profile, teammateNameDisplay);
        const nameB = displayUsername(b.profile, teammateNameDisplay);
        return nameA.localeCompare(nameB);
    };
};

const sortByState = (presenterID?: string) => {
    return (a: CallParticipant, b: CallParticipant) => {
        if (a.id === presenterID) {
            return -1;
        } else if (b.id === presenterID) {
            return 1;
        }

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
    };
};

export function getUserIdFromDM(dmName: string, currentUserId: string) {
    const ids = dmName.split('__');
    let otherUserId = '';
    if (ids[0] === currentUserId) {
        otherUserId = ids[1];
    } else {
        otherUserId = ids[0];
    }
    return otherUserId;
}
