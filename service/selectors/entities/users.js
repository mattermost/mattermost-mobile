// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {createSelector} from 'reselect';

import {getCurrentChannelId} from './channels';

export function getCurrentUserId(state) {
    return state.entities.users.currentId;
}

export function getProfilesInChannel(state) {
    return state.entities.users.profilesInChannel;
}

export function getUserStatuses(state) {
    return state.entities.users.statuses;
}

export function getUser(state, id) {
    return state.entities.users.profiles[id];
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

export const getProfileSetInCurrentChannel = createSelector(
    getCurrentChannelId,
    getProfilesInChannel,
    (currentChannel, channelProfiles) => {
        return channelProfiles[currentChannel];
    }
);

export const getProfilesInCurrentChannel = createSelector(
    getUsers,
    getProfileSetInCurrentChannel,
    (profiles, currentChannelProfileSet) => {
        const currentProfiles = [];
        if (typeof currentChannelProfileSet === 'undefined') {
            return currentProfiles;
        }

        currentChannelProfileSet.forEach((p) => {
            currentProfiles.push(profiles[p]);
        });

        const sortedCurrentProfiles = currentProfiles.sort((a, b) => {
            const nameA = a.username;
            const nameB = b.username;

            return nameA.localeCompare(nameB);
        });

        return sortedCurrentProfiles;
    }
);

export function getStatusForUserId(state, userId) {
    return getUserStatuses(state)[userId];
}
