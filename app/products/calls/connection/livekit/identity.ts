// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {USER_ID_SESSION_ID_SEPARATOR} from './constants';

type ParsedIdentity = {
    userID: string;
    sessionID: string;
}

// LiveKit participant identities are minted server-side as `userID___sessionID`.
// An identity that does not split cleanly still yields a usable session key, so
// state keyed on it degrades rather than being dropped.
export const parseIdentity = (identity: string): ParsedIdentity => {
    const parts = identity.split(USER_ID_SESSION_ID_SEPARATOR);
    if (parts.length !== 2) {
        return {userID: '', sessionID: identity};
    }

    const [userID, sessionID] = parts;
    return {userID, sessionID};
};
