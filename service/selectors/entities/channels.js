// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {createSelector} from 'reselect';
import {getCurrentTeamId} from 'service/selectors/entities/teams';
import {buildDisplayableChannelList} from 'service/utils/channel_utils';

function getAllChannels(state) {
    return state.entities.channels.channels;
}

export function getCurrentChannelId(state) {
    return state.entities.channels.currentId;
}

export const getCurrentChannel = createSelector(
    getAllChannels,
    getCurrentChannelId,
    (allChannels, currentChannelId) => {
        return allChannels[currentChannelId];
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
    getChannelsOnCurrentTeam,
    (state) => state.entities.users,
    (state) => state.entities.preferences.myPreferences,
    (state) => state.entities.teams,
    (channels, usersState, myPreferences, teamsState) => {
        return buildDisplayableChannelList(usersState, teamsState, channels, myPreferences);
    }
);
