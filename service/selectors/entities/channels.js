// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {createSelector} from 'reselect';
import {getCurrentTeamId} from 'service/selectors/entities/teams';
import {buildDisplayableChannelList, getNotMemberChannels, completeDirectChannelInfo} from 'service/utils/channel_utils';
import {Constants} from 'service/constants';

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

export function getAutocompleteChannels(state) {
    return state.entities.channels.autocompleteChannels;
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
        return channelMemberships[currentChannelId] || {};
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

export const getDefaultChannel = createSelector(
    getAllChannels,
    getCurrentTeamId,
    (channels, teamId) => {
        return Object.values(channels).find((c) => c.team_id === teamId && c.name === Constants.DEFAULT_CHANNEL);
    }
);

export const getMoreChannels = createSelector(
    getAllChannels,
    getChannelMemberships,
    (allChannels, myMembers) => {
        return getNotMemberChannels(Object.values(allChannels), myMembers);
    }
);

export const getUnreads = createSelector(
    getAllChannels,
    getChannelMemberships,
    (channels, myMembers) => {
        let messageCount = 0;
        let mentionCount = 0;
        Object.keys(myMembers).forEach((channelId) => {
            const channel = channels[channelId];
            const m = myMembers[channelId];
            if (channel && m) {
                if (channel.type === 'D') {
                    mentionCount += channel.total_msg_count - m.msg_count;
                } else if (m.mention_count > 0) {
                    mentionCount += m.mention_count;
                }
                if (m.notify_props && m.notify_props.mark_unread !== 'mention' && channel.total_msg_count - m.msg_count > 0) {
                    messageCount += 1;
                }
            }
        });

        return {messageCount, mentionCount};
    }
);

export const getAutocompleteChannelWithSections = createSelector(
    getChannelMemberships,
    getAutocompleteChannels,
    (myMembers, autocompleteChannels) => {
        const channels = {
            myChannels: [],
            otherChannels: []
        };
        autocompleteChannels.forEach((c) => {
            if (myMembers[c.id]) {
                channels.myChannels.push(c);
            } else {
                channels.otherChannels.push(c);
            }
        });

        return channels;
    }
);
