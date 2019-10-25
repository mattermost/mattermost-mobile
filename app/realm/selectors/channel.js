// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createSelector} from 'reselect';

import {General, Preferences} from 'app/constants';
import {SidebarSectionTypes} from 'app/constants/view'; // TODO: Move to constants
import {getUserIdFromChannelName, isChannelMuted, sortChannelsByRecencyOrAlpha} from 'app/realm/utils/channel';
import {getDisplayNameSettings, sortUsersByDisplayName} from 'app/realm/utils/user';

import {createIdsSelector} from './helper';

let lastChannels;
let lastFilteredChannels;
const hasChannelsChanged = (channels, last) => {
    if (!last || last.length !== channels.length) {
        return true;
    }

    for (let i = 0; i < channels.length; i++) {
        if (channels[i].type !== last[i].type || channels[i].items !== last[i].items) {
            return true;
        }
    }

    return false;
};

export const getSortedUnreadChannels = createSelector(
    (options) => options,
    (options) => {
        const {currentUserId, lastUnreadChannelId, teamChannels, filterArchived} = options;
        const channels = [];
        const members = {};

        teamChannels.forEach((channel) => {
            const member = channel.members.filtered('user.id = $0', currentUserId)[0];
            if (member) {
                const hasMessages = (channel.totalMsgCount - member.msgCount) > 0;
                const hasMentions = member.mentionCount > 0;
                const isArchived = channel.deleteAt > 0 && filterArchived;

                if (
                    !isArchived && (
                        channel.id === lastUnreadChannelId ||
                        (member.notifyPropsAsJSON && member.notifyPropsAsJSON.mark_unread !== 'mention' && hasMessages) ||
                        hasMentions
                    )
                ) {
                    members[channel.id] = member;
                    channels.push(channel);
                }
            }
        });

        return mapAndSortChannels(channels, members, {...options, sortMentionsFirst: true});
    }
);

export const getSortedUnreadChannelIds = createIdsSelector(
    getSortedUnreadChannels,
    (unreads) => {
        return unreads.map((c) => c.id);
    }
);

export const getSortedFavoriteChannels = createSelector(
    getSortedUnreadChannelIds,
    (options) => options,
    (unreadIds, options) => {
        const {currentUserId, preferences, teamChannels, filterArchived} = options;
        const favoriteIds = preferences.filtered('category = $0 AND value = "true"', Preferences.CATEGORY_FAVORITE_CHANNEL).map((favorite) => favorite.name);
        const visibleDirectIds = preferences.
            filtered('(category = $0 OR category = $1) AND value = "true"', Preferences.CATEGORY_DIRECT_CHANNEL_SHOW, Preferences.CATEGORY_GROUP_CHANNEL_SHOW).
            map((p) => p.name);
        const channels = [];
        const members = {};

        teamChannels.forEach((channel) => {
            const isArchived = channel.deleteAt > 0 && filterArchived;
            const member = channel.members.filtered('user.id = $0', currentUserId)[0];
            let excludeClosedDirect = false;

            switch (channel.type) {
            case General.DM_CHANNEL: {
                const teammateId = getUserIdFromChannelName(currentUserId, channel.name);
                excludeClosedDirect = !visibleDirectIds.includes(teammateId);
                break;
            }
            case General.GM_CHANNEL:
                excludeClosedDirect = !visibleDirectIds.includes(channel.id);
                break;
            }

            if (favoriteIds.includes(channel.id) && !unreadIds.includes(channel.id) && !isArchived && member && !excludeClosedDirect) {
                members[channel.id] = member;
                channels.push(channel);
            }
        });

        return mapAndSortChannels(channels, members, options);
    }
);

export const getSortedFavoriteChannelIds = createIdsSelector(
    getSortedFavoriteChannels,
    (favorites) => {
        return favorites.map((c) => c.id);
    }
);

export const getSortedPublicChannels = createSelector(
    getSortedUnreadChannelIds,
    getSortedFavoriteChannelIds,
    (options) => options,
    (unreadIds, favoriteIds, options) => {
        const {currentUserId, favoritesAtTop, unreadsAtTop, teamChannels, filterArchived} = options;
        const channels = [];
        const members = {};

        teamChannels.filtered('type = $0', General.OPEN_CHANNEL).forEach((channel) => {
            const isArchived = channel.deleteAt > 0 && filterArchived;
            const member = channel.members.filtered('user.id = $0', currentUserId)[0];

            if (!isArchived && member) {
                members[channel.id] = member;
                channels.push(channel);
            }
        });

        const publicChannels = filterChannels(
            unreadIds,
            favoriteIds,
            channels,
            unreadsAtTop,
            favoritesAtTop,
        );

        return mapAndSortChannels(publicChannels, members, options);
    }
);

export const getSortedPublicChannelIds = createIdsSelector(
    getSortedPublicChannels,
    (channels) => {
        return channels.map((c) => c.id);
    }
);

export const getSortedPrivateChannels = createSelector(
    getSortedUnreadChannelIds,
    getSortedFavoriteChannelIds,
    (options) => options,
    (unreadIds, favoriteIds, options) => {
        const {currentUserId, favoritesAtTop, unreadsAtTop, teamChannels, filterArchived} = options;
        const channels = [];
        const members = {};

        teamChannels.filtered('type = $0', General.PRIVATE_CHANNEL).forEach((channel) => {
            const isArchived = channel.deleteAt > 0 && filterArchived;
            const member = channel.members.filtered('user.id = $0', currentUserId)[0];

            if (!isArchived && member) {
                members[channel.id] = member;
                channels.push(channel);
            }
        });

        const privateChannels = filterChannels(
            unreadIds,
            favoriteIds,
            channels,
            unreadsAtTop,
            favoritesAtTop,
        );

        return mapAndSortChannels(privateChannels, members, options);
    }
);

export const getSortedPrivateChannelIds = createIdsSelector(
    getSortedPrivateChannels,
    (channels) => {
        return channels.map((c) => c.id);
    }
);

export const getSortedDirectChannels = createSelector(
    getSortedUnreadChannelIds,
    getSortedFavoriteChannelIds,
    (options) => options,
    (unreadIds, favoriteIds, options) => {
        const {currentUserId, favoritesAtTop, preferences, teamChannels, unreadsAtTop, showHiddenDirectChannels} = options;
        const channels = [];
        const members = {};
        let visibleDirectIds;

        if (!showHiddenDirectChannels) {
            visibleDirectIds = preferences.
                filtered('(category = $0 OR category = $1) AND value = "true"', Preferences.CATEGORY_DIRECT_CHANNEL_SHOW, Preferences.CATEGORY_GROUP_CHANNEL_SHOW).
                map((p) => p.name);
        }

        teamChannels.
            filtered('type = $0 OR type = $1', General.DM_CHANNEL, General.GM_CHANNEL).
            forEach((channel) => {
                const member = channel.members.filtered('user.id = $0', currentUserId)[0];
                let add = false;

                switch (channel.type) {
                case General.DM_CHANNEL: {
                    const teammateId = getUserIdFromChannelName(currentUserId, channel.name);
                    const teammate = channel.members.filtered('user.id = $0', teammateId)[0];
                    add = showHiddenDirectChannels || (visibleDirectIds.includes(teammateId) && !autoCloseDirectChannel(member, teammate?.deleteAt || 0, options));
                    break;
                }
                case General.GM_CHANNEL:
                    add = showHiddenDirectChannels || (visibleDirectIds.includes(channel.id) && !autoCloseDirectChannel(member, 0, options));
                    break;
                }

                if (add && member) {
                    members[channel.id] = member;
                    channels.push(channel);
                }
            });

        const directChannels = filterChannels(
            unreadIds,
            favoriteIds,
            channels,
            unreadsAtTop,
            favoritesAtTop,
        );

        return mapAndSortChannels(directChannels, members, options);
    }
);

export const getSortedDirectChannelIds = createIdsSelector(
    getSortedDirectChannels,
    (channels) => {
        return channels.map((c) => c.id);
    }
);

export const getAllSortedChannels = createSelector(
    getSortedUnreadChannelIds,
    getSortedFavoriteChannelIds,
    (options) => options,
    (unreadIds, favoriteIds, options) => {
        const {currentUserId, favoritesAtTop, unreadsAtTop, teamChannels, filterArchived} = options;
        const channels = [];
        const members = {};

        teamChannels.forEach((channel) => {
            const isArchived = channel.deleteAt > 0 && filterArchived;
            const member = channel.members.filtered('user.id = $0', currentUserId)[0];

            if (!isArchived && member) {
                members[channel.id] = member;
                channels.push(channel);
            }
        });

        const allChannels = filterChannels(
            unreadIds,
            favoriteIds,
            channels,
            unreadsAtTop,
            favoritesAtTop,
        );

        return mapAndSortChannels(allChannels, members, options);
    }
);

export const getAllSortedChannelIds = createIdsSelector(
    getAllSortedChannels,
    (channels) => {
        return channels.map((c) => c.id);
    }
);

export const getSortedPublicAndPrivateChannels = createSelector(
    getSortedUnreadChannelIds,
    getSortedFavoriteChannelIds,
    (options) => options,
    (unreadIds, favoriteIds, options) => {
        const {currentUserId, favoritesAtTop, unreadsAtTop, teamChannels, filterArchived} = options;
        const channels = [];
        const members = {};

        teamChannels.
            filtered('type = $0 OR type = $1', General.OPEN_CHANNEL, General.PRIVATE_CHANNEL).
            forEach((channel) => {
                const isArchived = channel.deleteAt > 0 && filterArchived;
                const member = channel.members.filtered('user.id = $0', currentUserId)[0];

                if (!isArchived && member) {
                    members[channel.id] = member;
                    channels.push(channel);
                }
            });

        const allChannels = filterChannels(
            unreadIds,
            favoriteIds,
            channels,
            unreadsAtTop,
            favoritesAtTop,
        );

        return mapAndSortChannels(allChannels, members, options);
    }
);

export const getSortedArchivedChannels = createSelector(
    (options) => options,
    (options) => {
        const {currentUserId, teamChannels} = options;
        const channels = [];
        const members = {};

        teamChannels.
            filtered('type = $0 OR type = $1', General.OPEN_CHANNEL, General.PRIVATE_CHANNEL).
            forEach((channel) => {
                const isArchived = channel.deleteAt;
                const member = channel.members.filtered('user.id = $0', currentUserId)[0];

                if (isArchived && member) {
                    members[channel.id] = member;
                    channels.push(channel);
                }
            });

        const allChannels = filterChannels(
            [],
            [],
            channels,
            false,
            false,
        );

        return mapAndSortChannels(allChannels, members, options);
    }
);

export const getSortedOtherChannels = createSelector(
    (options) => options,
    (options) => {
        const {currentUserId, teamChannels} = options;
        const channels = [];

        teamChannels.
            filtered('type = $0 OR type = $1', General.OPEN_CHANNEL, General.PRIVATE_CHANNEL).
            forEach((channel) => {
                const member = channel.members.filtered('user.id = $0', currentUserId)[0];

                if (!member) {
                    channels.push(channel);
                }
            });

        const allChannels = filterChannels(
            [],
            [],
            channels,
            false,
            false,
        );

        return mapAndSortChannels(allChannels, null, options);
    }
);

export const getSortedProfilesWithoutDM = createSelector(
    (options) => options,
    (options) => {
        const {currentUserId, locale, preferences, profiles, restrictDms, teammateDisplayNameSettings} = options;
        const teammateDisplayNamePref = preferences.filtered('category = $0 AND name = $1', Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.NAME_NAME_FORMAT)[0];
        const displayNameSettings = getDisplayNameSettings(teammateDisplayNameSettings, teammateDisplayNamePref);
        const lang = locale || General.DEFAULT_LOCALE;
        const result = [];

        let users = profiles;
        if (restrictDms) {
            users = profiles.map((p) => p.user);
        }

        users.forEach((profile) => {
            if (profile.id !== currentUserId) {
                const directChannel = preferences.filtered('category = $0 AND name = $1', Preferences.CATEGORY_DIRECT_CHANNEL_SHOW, profile.id);

                if (directChannel.isEmpty()) {
                    result.push(profile);
                }
            }
        });

        return result.sort(sortUsersByDisplayName.bind(null, lang, displayNameSettings));
    }
);

export const getSortedChannelIds = (options) => {
    const channels = [];

    if (options.grouping === 'by_type') {
        channels.push({
            type: SidebarSectionTypes.PUBLIC,
            name: 'PUBLIC CHANNELS',
            items: getSortedPublicChannelIds(options),
        });

        channels.push({
            type: SidebarSectionTypes.PRIVATE,
            name: 'PRIVATE CHANNELS',
            items: getSortedPrivateChannelIds(options),
        });

        channels.push({
            type: SidebarSectionTypes.DIRECT,
            name: 'DIRECT MESSAGES',
            items: getSortedDirectChannelIds(options),
        });
    } else {
        // Combine all channel types
        let type = SidebarSectionTypes.ALPHA;
        let name = 'CHANNELS';
        if (options.sortingType === 'recent') {
            type = SidebarSectionTypes.RECENT_ACTIVITY;
            name = 'RECENT ACTIVITY';
        }

        channels.push({
            type,
            name,
            items: getAllSortedChannelIds(options),
        });
    }

    if (options.favoritesAtTop) {
        channels.unshift({
            type: SidebarSectionTypes.FAVORITE,
            name: 'FAVORITE CHANNELS',
            items: getSortedFavoriteChannelIds(options),
        });
    }

    if (options.unreadsAtTop) {
        const items = getSortedUnreadChannelIds(options);
        if (items.length) {
            channels.unshift({
                type: SidebarSectionTypes.UNREADS,
                name: 'UNREADS',
                items,
            });
        }
    }

    if (hasChannelsChanged(channels, lastChannels)) {
        lastChannels = channels;
    }

    return lastChannels;
};

export const getFilteredChannels = (options) => {
    const channels = [];

    channels.push({
        type: SidebarSectionTypes.ALPHA,
        name: 'CHANNELS',
        items: getSortedPublicAndPrivateChannels(options),
    });

    channels.push({
        type: SidebarSectionTypes.DIRECT,
        name: 'DIRECT MESSAGES',
        items: getSortedDirectChannels(options),
    });

    if (options.canJoinPublicChannels) {
        channels.push({
            type: SidebarSectionTypes.OTHER,
            name: 'OTHER CHANNELS',
            items: getSortedOtherChannels(options),
        });
    }

    channels.push({
        type: SidebarSectionTypes.ARCHIVED,
        name: 'ARCHIVED',
        items: getSortedArchivedChannels(options),
    });

    const unreads = getSortedUnreadChannels(options);
    if (unreads.length) {
        channels.unshift({
            type: SidebarSectionTypes.UNREADS,
            name: 'UNREADS',
            items: unreads,
        });
    }

    channels.push({
        type: SidebarSectionTypes.MEMBERS,
        name: 'MEMBERS',
        items: getSortedProfilesWithoutDM(options),
    });

    if (hasChannelsChanged(channels, lastFilteredChannels)) {
        lastFilteredChannels = channels;
    }

    return lastFilteredChannels;
};

export const getDrawerUnreadCount = createSelector(
    (currentUserId) => currentUserId,
    (_, teamMembers) => teamMembers,
    (_, __, directChannels) => directChannels,
    (currentUserId, teamMembers, directChannels) => {
        let messages = 0;
        let mentions = 0;

        directChannels.forEach((channel) => {
            const total = channel.totalMsgCount;
            const member = channel.members.filtered('user.id = $0', currentUserId)[0];
            if (member) {
                messages += Math.max((total - member.msgCount), 0);
                mentions += member.mentionCount;
            }
        });

        teamMembers.forEach((member) => {
            messages += member.msgCount;
            mentions += member.mentionCount;
        });

        return {messages, mentions};
    }
);

function filterChannels(unreadIds, favoriteIds, channels, unreadsAtTop, favoritesAtTop) {
    const channelsArray = channels.filter((c) => {
        let filter = true;

        if (unreadsAtTop) {
            filter = !unreadIds.includes(c.id);
        }

        if (favoritesAtTop && filter) {
            filter = !favoriteIds.includes(c.id);
        }

        return filter;
    });

    return channelsArray;
}

function mapAndSortChannels(channels, myMembers, options) {
    const {
        currentUserId,
        locale,
        sortingType,
        sortMentionsFirst,
        preferences,
        teammateDisplayNameSettings,
    } = options;
    const lang = locale || General.DEFAULT_LOCALE;

    const teammateDisplayNamePref = preferences.filtered('category = $0 AND name = $1', Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.NAME_NAME_FORMAT)[0];
    const displayNameSettings = getDisplayNameSettings(teammateDisplayNameSettings, teammateDisplayNamePref);

    let mutedChannels = [];
    let mutedChannelIds = [];
    if (myMembers) {
        mutedChannels = channels.
            filter((c) => isChannelMuted(myMembers[c.id])).
            sort(sortChannelsByRecencyOrAlpha.bind(null, currentUserId, lang, displayNameSettings, myMembers, sortingType));

        mutedChannelIds = mutedChannels.map((c) => c.id);
    }

    let channelsWithMentions = [];
    let channelIdsWithMentions = [];
    if (sortMentionsFirst && myMembers) {
        channelsWithMentions = channels.
            filter((c) => {
                const member = myMembers[c.id];
                return member?.mentionCount > 0 && !isChannelMuted(member);
            }).
            sort(sortChannelsByRecencyOrAlpha.bind(null, currentUserId, lang, displayNameSettings, myMembers, sortingType));
        channelIdsWithMentions = channelsWithMentions.map((c) => c.id);
    }

    const otherChannels = channels.
        filter((c) => {
            return !mutedChannelIds.includes(c.id) && !channelIdsWithMentions.includes(c.id);
        }).
        sort(sortChannelsByRecencyOrAlpha.bind(null, currentUserId, lang, displayNameSettings, myMembers, sortingType));

    return sortMentionsFirst ? channelsWithMentions.concat(otherChannels, mutedChannels) : otherChannels.concat(mutedChannels);
}

function autoCloseDirectChannel(member, archivedTime, options) {
    const {closeUnusedDirectMessages, currentChannelId, preferences} = options;
    const channel = member.channels[0];
    const cutoff = new Date().getTime() - (7 * 24 * 60 * 60 * 1000);
    const viewTimePref = preferences.filtered('category = $0 AND name = $1', Preferences.CATEGORY_CHANNEL_APPROXIMATE_VIEW_TIME, channel?.id)[0];
    const viewTime = viewTimePref ? parseInt(viewTimePref.value, 10) : 0;

    if (viewTime > cutoff) {
        return false;
    }

    const openTimePref = preferences.filtered('category = $0 AND name = $1', Preferences.CATEGORY_CHANNEL_OPEN_TIME, channel?.id)[0];
    const openTime = openTimePref ? parseInt(openTimePref.value, 10) : 0;

    // Only close archived channels when not being viewed
    if (channel?.id !== currentChannelId && archivedTime && archivedTime > openTime) {
        return true;
    }

    const favoritePref = preferences.filtered('category = $0 AND name = $1', Preferences.CATEGORY_FAVORITE_CHANNEL, channel?.id);
    if (closeUnusedDirectMessages !== 'true' || !favoritePref.isEmpty()) {
        return false;
    }

    const autoClosePref = preferences.filtered('category = $0 AND name = $1', Preferences.CATEGORY_SIDEBAR_SETTINGS, 'close_unused_direct_messages')[0];
    if (!autoClosePref || autoClosePref.value === 'after_seven_days') {
        if ((member.lastUpdateAt && member.lastUpdateAt > cutoff) || (openTime > cutoff)) {
            return false;
        }

        const lastActivity = channel.lastPostAt;
        return !lastActivity || lastActivity < cutoff;
    }

    return false;
}
