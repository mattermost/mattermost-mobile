// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {createSelector} from 'reselect';
import {getCurrentTeamId} from 'service/selectors/entities/teams';
import {buildDisplayableChannelList, completeDirectChannelInfo} from 'service/utils/channel_utils';

function getAllChannels(state) {
    return state.entities.channels.channels;
}

function getAllChannelStats(state) {
    return state.entities.channels.stats;
}

export function getCurrentChannelId(state) {
    return state.entities.channels.currentId;
}

export function getChannelMemberships(state) {
    return state.entities.channels.myMembers;
}

export const getCurrentChannel = createSelector(
    getAllChannels,
    getCurrentChannelId,
    (state) => state.entities.users,
    (state) => state.entities.preferences.myPreferences,
    (allChannels, currentChannelId, users, myPreferences) => {
        const channel = allChannels[currentChannelId];
        if (channel) {
            return completeDirectChannelInfo(users, myPreferences, channel);
        }
        return channel;
    }
);

export const getCurrentChannelMembership = createSelector(
    getCurrentChannelId,
    getChannelMemberships,
    (currentChannelId, channelMemberships) => {
        return channelMemberships[currentChannelId];
    }
);

export const getCurrentChannelStats = createSelector(
    getAllChannelStats,
    getCurrentChannelId,
    (allChannelStats, currentChannelId) => {
        return allChannelStats[currentChannelId];
    }
);

export const getChannelsOnCurrentTeam = createSelector(
    getAllChannels,
    getCurrentTeamId,
    (allChannels, currentTeamId) => {
        const channels = [];

        for (const channel of Object.values(allChannels)) {
            if (channel.team_id === currentTeamId || channel.team_id === '') {
                channels.push(channel);
            }
        }

        return channels;
    }
);

export const getChannelsByCategory = createSelector(
    getCurrentChannelId,
    getChannelsOnCurrentTeam,
    (state) => state.entities.channels.myMembers,
    (state) => state.entities.users,
    (state) => state.entities.preferences.myPreferences,
    (state) => state.entities.teams,
    (currentChannelId, channels, myMembers, usersState, myPreferences, teamsState) => {
        const allChannels = channels.map((c) => {
            const channel = {...c};
            channel.isCurrent = c.id === currentChannelId;
            return channel;
        }).filter((c) => myMembers.hasOwnProperty(c.id));

        return buildDisplayableChannelList(usersState, teamsState, allChannels, myPreferences);
    }
);
