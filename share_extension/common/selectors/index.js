// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createSelector} from 'reselect';

import {General} from 'mattermost-redux/constants';
import {getAllChannels, getChannelsInTeam, getMyChannelMemberships} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentUser, getUsers} from 'mattermost-redux/selectors/entities/users';
import {getConfig} from 'mattermost-redux/selectors/entities/general';
import {getLastPostPerChannel} from 'mattermost-redux/selectors/entities/posts';
import {
    getMyPreferences,
    getTeammateNameDisplaySetting,
    getVisibleTeammate,
    getVisibleGroupIds,
} from 'mattermost-redux/selectors/entities/preferences';

import {
    completeDirectChannelDisplayName,
    getDirectChannelName,
    getGroupDisplayNameFromUserIds,
    getUserIdFromChannelName,
    isAutoClosed,
    sortChannelsByDisplayName,
} from 'mattermost-redux/utils/channel_utils';
import {createIdsSelector} from 'mattermost-redux/utils/helpers';

export const getChannelIdsForExtensionTeam = createIdsSelector(
    (state) => state.views.extension.selectedTeamId,
    getChannelsInTeam,
    (teamId, channelsInTeam) => {
        return Array.from(channelsInTeam[teamId] || []);
    }
);

export const getExtensionSortedPublicChannels = createSelector(
    getCurrentUser,
    getAllChannels,
    getMyChannelMemberships,
    getChannelIdsForExtensionTeam,
    (currentUser, channels, myMembers, teamChannelIds) => {
        if (!currentUser) {
            return [];
        }

        const locale = currentUser.locale || 'en';
        return teamChannelIds.reduce((publicChannels, id) => {
            if (!myMembers[id]) {
                return publicChannels;
            }

            const channel = channels[id];
            if (channel.type === General.OPEN_CHANNEL) {
                publicChannels.push(channel);
            }

            return publicChannels;
        }, []).sort(sortChannelsByDisplayName.bind(null, locale));
    }
);

export const getExtensionSortedPrivateChannels = createSelector(
    getCurrentUser,
    getAllChannels,
    getMyChannelMemberships,
    getChannelIdsForExtensionTeam,
    (currentUser, channels, myMembers, teamChannelIds) => {
        if (!currentUser) {
            return [];
        }

        const locale = currentUser.locale || 'en';
        return teamChannelIds.reduce((privateChannels, id) => {
            if (!myMembers[id]) {
                return privateChannels;
            }

            const channel = channels[id];
            if (channel.type === General.PRIVATE_CHANNEL) {
                privateChannels.push(channel);
            }

            return privateChannels;
        }, []).sort(sortChannelsByDisplayName.bind(null, locale));
    }
);

export const getExtensionSortedDirectChannels = createSelector(
    getCurrentUser,
    getUsers,
    (state) => state.entities.users.profilesInChannel,
    getAllChannels,
    getVisibleTeammate,
    getVisibleGroupIds,
    getTeammateNameDisplaySetting,
    getConfig,
    getMyPreferences,
    getLastPostPerChannel,
    (currentUser, profiles, profilesInChannel, channels, teammates, groupIds, settings, config, preferences, lastPosts) => {
        if (!currentUser) {
            return [];
        }

        const locale = currentUser.locale || 'en';
        const channelValues = Object.values(channels);
        const directChannelsIds = [];
        teammates.reduce((result, teammateId) => {
            const name = getDirectChannelName(currentUser.id, teammateId);
            const channel = channelValues.find((c) => c.name === name); //eslint-disable-line max-nested-callbacks
            if (channel) {
                const lastPost = lastPosts[channel.id];
                const otherUser = profiles[getUserIdFromChannelName(currentUser.id, channel.name)];
                if (!isAutoClosed(config, preferences, channel, lastPost ? lastPost.create_at : 0, otherUser ? otherUser.delete_at : 0)) {
                    result.push(channel.id);
                }
            }
            return result;
        }, directChannelsIds);
        const directChannels = groupIds.filter((id) => {
            const channel = channels[id];
            if (channel) {
                const lastPost = lastPosts[channel.id];
                return !isAutoClosed(config, preferences, channels[id], lastPost ? lastPost.create_at : 0);
            }

            return false;
        }).concat(directChannelsIds).map((id) => {
            const channel = channels[id];
            if (channel.type === General.GM_CHANNEL) {
                return completeDirectGroupInfo(currentUser.id, profiles, profilesInChannel, settings, channel);
            }
            return completeDirectChannelDisplayName(currentUser.id, profiles, profilesInChannel[id], settings, channel);
        }).sort(sortChannelsByDisplayName.bind(null, locale));
        return directChannels;
    }
);

function completeDirectGroupInfo(currentUserId, profiles, profilesInChannel, teammateNameDisplay, channel) {
    const profilesIds = profilesInChannel[channel.id];
    const gm = {...channel};

    if (profilesIds) {
        return Object.assign(gm, {
            display_name: getGroupDisplayNameFromUserIds(profilesIds, profiles, currentUserId, teammateNameDisplay),
        });
    }

    const usernames = gm.display_name.split(', ');
    const users = Object.values(profiles);
    const userIds = [];
    usernames.forEach((username) => {
        const u = users.find((p) => p.username === username);
        if (u) {
            userIds.push(u.id);
        }
    });
    if (usernames.length === userIds.length) {
        return Object.assign(gm, {
            display_name: getGroupDisplayNameFromUserIds(userIds, profiles, currentUserId, teammateNameDisplay),
        });
    }

    return channel;
}
