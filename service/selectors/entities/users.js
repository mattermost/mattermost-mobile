// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {createSelector} from 'reselect';

export function getCurrentUserId(state) {
    return state.entities.users.currentId;
}

export function getUsers(state) {
    return state.entities.users.profiles;
}

export const getCurrentUser = createSelector(
    getUsers,
    getCurrentUserId,
    (profiles, currentUserId) => {
        return profiles[currentUserId];
    }
);

export function getUser(state, id) {
    return state.entities.users.profiles[id];
}
