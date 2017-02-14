// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {createSelector} from 'reselect';

import {getCurrentChannelId, getCurrentChannelMembership} from './channels';
import {getCurrentTeamMembership} from './teams';

export function getCurrentUserId(state) {
    return state.entities.users.currentId;
}

export function getProfilesInChannel(state) {
    return state.entities.users.profilesInChannel;
}

export function getProfilesNotInChannel(state) {
    return state.entities.users.profilesNotInChannel;
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

export function getAutocompleteUsersInChannel(state) {
    return state.entities.users.autocompleteUsersInChannel;
}

export const getCurrentUser = createSelector(
    getUsers,
    getCurrentUserId,
    (profiles, currentUserId) => {
        return profiles[currentUserId];
    }
);

export const getCurrentUserRoles = createSelector(
    getCurrentChannelMembership,
    getCurrentTeamMembership,
    getCurrentUser,
    (currentChannelMembership, currentTeamMembership, currentUser) => {
        return `${currentTeamMembership.roles} ${currentChannelMembership.roles} ${currentUser.roles}`;
    }
);

export const getProfileSetInCurrentChannel = createSelector(
    getCurrentChannelId,
    getProfilesInChannel,
    (currentChannel, channelProfiles) => {
        return channelProfiles[currentChannel];
    }
);

export const getProfileSetNotInCurrentChannel = createSelector(
    getCurrentChannelId,
    getProfilesNotInChannel,
    (currentChannel, channelProfiles) => {
        return channelProfiles[currentChannel];
    }
);

function sortAndInjectProfiles(profiles, profileSet) {
    const currentProfiles = [];
    if (typeof profileSet === 'undefined') {
        return currentProfiles;
    }

    profileSet.forEach((p) => {
        currentProfiles.push(profiles[p]);
    });

    const sortedCurrentProfiles = currentProfiles.sort((a, b) => {
        const nameA = a.username;
        const nameB = b.username;

        return nameA.localeCompare(nameB);
    });

    return sortedCurrentProfiles;
}

export const getProfilesInCurrentChannel = createSelector(
    getUsers,
    getProfileSetInCurrentChannel,
    (profiles, currentChannelProfileSet) => sortAndInjectProfiles(profiles, currentChannelProfileSet)
);

export const getProfilesNotInCurrentChannel = createSelector(
    getUsers,
    getProfileSetNotInCurrentChannel,
    (profiles, notInCurrentChannelProfileSet) => sortAndInjectProfiles(profiles, notInCurrentChannelProfileSet)
);

export function getStatusForUserId(state, userId) {
    return getUserStatuses(state)[userId];
}

export const getAutocompleteUsersInCurrentChannel = createSelector(
    getCurrentChannelId,
    getAutocompleteUsersInChannel,
    (currentChannelId, autocompleteUsersInChannel) => {
        return autocompleteUsersInChannel[currentChannelId] || {};
    }
);

export const searchProfiles = createSelector(
    (state) => state.entities.users.search,
    getCurrentUserId,
    (users, currentId) => {
        const profiles = {...users};
        return Object.values(profiles).sort((a, b) => {
            const nameA = a.username;
            const nameB = b.username;

            return nameA.localeCompare(nameB);
        }).filter((p) => p.id !== currentId);
    }
);
