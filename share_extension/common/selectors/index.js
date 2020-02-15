// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createSelector} from 'reselect';

import {General} from 'mattermost-redux/constants';
import {getAllChannels, getChannelsInTeam, getMyChannelMemberships} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentUser, getUsers} from 'mattermost-redux/selectors/entities/users';
import {
    getTeammateNameDisplaySetting,
    getVisibleTeammate,
    getVisibleGroupIds,
} from 'mattermost-redux/selectors/entities/preferences';

import {
    completeDirectChannelDisplayName,
    getDirectChannelName,
    getGroupDisplayNameFromUserIds,
    sortChannelsByDisplayName,
    getChannelByName,
} from 'mattermost-redux/utils/channel_utils';
import {createIdsSelector} from 'mattermost-redux/utils/helpers';

export const getChannelIdsForExtensionTeam = createIdsSelector(
    (state) => state.views.extension.selectedTeamId,
    getChannelsInTeam,
    (teamId, channelsInTeam) => {
        return Array.from(channelsInTeam[teamId] || []);
    },
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
            const channel = channels[id];
            if (channel.type === General.OPEN_CHANNEL) {
                publicChannels.push(channel);
            }

            return publicChannels;
        }, []).sort(sortChannelsByDisplayName.bind(null, locale));
    },
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
            const channel = channels[id];
            if (channel.type === General.PRIVATE_CHANNEL) {
                privateChannels.push(channel);
            }

            return privateChannels;
        }, []).sort(sortChannelsByDisplayName.bind(null, locale));
    },
);

export const getExtensionSortedDirectChannels = createSelector(
    getCurrentUser,
    getUsers,
    (state) => state.entities.users.profilesInChannel,
    getAllChannels,
    getVisibleTeammate,
    getVisibleGroupIds,
    getTeammateNameDisplaySetting,
    (currentUser, profiles, profilesInChannel, channels, teammates, groupIds, settings) => {
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
                result.push(channel.id);
            }
            return result;
        }, directChannelsIds);

        const directChannels = groupIds.concat(directChannelsIds).map((id) => {
            const channel = channels[id];
            if (channel.type === General.GM_CHANNEL) {
                return completeDirectGroupInfo(currentUser.id, profiles, profilesInChannel, settings, channel);
            }
            return completeDirectChannelDisplayName(currentUser.id, profiles, profilesInChannel[id], settings, channel);
        }).sort(sortChannelsByDisplayName.bind(null, locale));

        const globalActiveUserChannels = Object.keys(profiles).reduce((result, id) => {
            if (profiles[id].delete_at === 0) {
                const channelName = getDirectChannelName(currentUser.id, id);
                const channel = getChannelByName(channels, channelName);

                if (channel) {
                    // add existing (but closed) DM channels, removing duplicates
                    for (let i = 0; i < directChannelsIds.length; i++) {
                        if (channel.id === directChannelsIds[i]) {
                            return result;
                        }
                    }
                    result.push(completeDirectChannelDisplayName(currentUser.id, profiles, profilesInChannel[id], settings, channel));
                } else {
                    // create placeholder channel to display item, and facilitate channel creation if user selects
                    const placeholderChannel = {
                        notCreatedYet: true,
                        id,
                        otherUserId: id,
                        type: 'D',
                        delete_at: 0,
                        display_name: profiles[id].username,
                    };
                    result.push(placeholderChannel);
                }
                return result;
            }
            return result;
        }, []).sort(sortChannelsByDisplayName.bind(null, locale));

        const allDirectChannels = directChannels.concat(globalActiveUserChannels);
        return allDirectChannels;
    },
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
