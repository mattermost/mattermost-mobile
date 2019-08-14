// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {General, Preferences} from 'app/constants';
import {getUserIdFromChannelName, isChannelMuted, sortChannelsByRecencyOrAlpha} from 'app/realm/utils/channel';
import {getDisplayNameSettings} from 'app/realm/utils/user';

import {createIdsSelector} from './helper';

let lastChannels;
const hasChannelsChanged = (channels) => {
    if (!lastChannels || lastChannels.length !== channels.length) {
        return true;
    }

    for (let i = 0; i < channels.length; i++) {
        if (channels[i].type !== lastChannels[i].type || channels[i].items !== lastChannels[i].items) {
            return true;
        }
    }

    return false;
};

export const getSortedUnreadChannelIds = createIdsSelector(
    (options) => options,
    (options) => {
        const {currentUserId, lastUnreadChannelId, teamChannels} = options;
        const channels = [];
        const members = {};

        teamChannels.forEach((channel) => {
            const member = channel.members.filtered('user.id = $0', currentUserId)[0];
            const hasMessages = (channel.totalMsgCount - member.msgCount) > 0;
            const hasMentions = member.mentionCount > 0;

            if (
                channel.id === lastUnreadChannelId ||
                (member.notifyPropsAsJSON && member.notifyPropsAsJSON.mark_unread !== 'mention' && hasMessages) ||
                hasMentions
            ) {
                members[channel.id] = member;
                channels.push(channel);
            }
        });

        return mapAndSortChannelIds(channels, members, {...options, sortMentionsFirst: true});
    }
);

export const getSortedFavoriteChannelIds = createIdsSelector(
    getSortedUnreadChannelIds,
    (options) => options,
    (unreadIds, options) => {
        const {currentUserId, preferences, teamChannels} = options;
        const favoriteIds = preferences.filtered('category = $0', Preferences.CATEGORY_FAVORITE_CHANNEL).map((favorite) => favorite.name);
        const channels = [];
        const members = {};

        teamChannels.forEach((channel) => {
            const member = channel.members.filtered('user.id = $0', currentUserId)[0];
            if (favoriteIds.includes(channel.id) && !unreadIds.includes(channel.id)) {
                members[channel.id] = member;
                channels.push(channel);
            }
        });

        return mapAndSortChannelIds(channels, members, options);
    }
);

export const getSortedPublicChannelIds = createIdsSelector(
    getSortedUnreadChannelIds,
    getSortedFavoriteChannelIds,
    (options) => options,
    (unreadIds, favoriteIds, options) => {
        const {currentUserId, favoritesAtTop, unreadsAtTop, teamChannels} = options;
        const channels = [];
        const members = {};

        teamChannels.filtered('type = $0', General.OPEN_CHANNEL).forEach((channel) => {
            const member = channel.members.filtered('user.id = $0', currentUserId)[0];

            members[channel.id] = member;
            channels.push(channel);
        });

        const publicChannels = filterChannels(
            unreadIds,
            favoriteIds,
            channels,
            unreadsAtTop,
            favoritesAtTop,
        );

        return mapAndSortChannelIds(publicChannels, members, options);
    }
);

export const getSortedPrivateChannelIds = createIdsSelector(
    getSortedUnreadChannelIds,
    getSortedFavoriteChannelIds,
    (options) => options,
    (unreadIds, favoriteIds, options) => {
        const {currentUserId, favoritesAtTop, unreadsAtTop, teamChannels} = options;
        const channels = [];
        const members = {};

        teamChannels.filtered('type = $0', General.PRIVATE_CHANNEL).forEach((channel) => {
            const member = channel.members.filtered('user.id = $0', currentUserId)[0];

            members[channel.id] = member;
            channels.push(channel);
        });

        const privateChannels = filterChannels(
            unreadIds,
            favoriteIds,
            channels,
            unreadsAtTop,
            favoritesAtTop,
        );

        return mapAndSortChannelIds(privateChannels, members, options);
    }
);

export const getSortedDirectChannelIds = createIdsSelector(
    getSortedUnreadChannelIds,
    getSortedFavoriteChannelIds,
    (options) => options,
    (unreadIds, favoriteIds, options) => {
        const {currentUserId, favoritesAtTop, preferences, teamChannels, unreadsAtTop} = options;
        const channels = [];
        const members = {};
        const visibleDirectIds = preferences.
            filtered('(category = $0 OR category = $1) AND value = "true"', Preferences.CATEGORY_DIRECT_CHANNEL_SHOW, Preferences.CATEGORY_GROUP_CHANNEL_SHOW).
            map((p) => p.name);

        teamChannels.
            filtered('type = $0 OR type = $1', General.DM_CHANNEL, General.GM_CHANNEL).
            forEach((channel) => {
                const member = channel.members.filtered('user.id = $0', currentUserId)[0];
                let add = false;

                switch (channel.type) {
                case General.DM_CHANNEL: {
                    const teammateId = getUserIdFromChannelName(currentUserId, channel.name);
                    const teammate = channel.members.filtered('user.id = $0', teammateId)[0];
                    add = visibleDirectIds.includes(teammateId) && !autoCloseDirectChannel(member, teammate?.deleteAt || 0, options);
                    break;
                }
                case General.GM_CHANNEL:
                    add = visibleDirectIds.includes(channel.id) && !autoCloseDirectChannel(member, 0, options);
                    break;
                }

                if (add) {
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

        return mapAndSortChannelIds(directChannels, members, options);
    }
);

export const getAllSortedChannelIds = createIdsSelector(
    getSortedUnreadChannelIds,
    getSortedFavoriteChannelIds,
    (options) => options,
    (unreadIds, favoriteIds, options) => {
        const {currentUserId, favoritesAtTop, unreadsAtTop, teamChannels} = options;
        const channels = [];
        const members = {};

        teamChannels.forEach((channel) => {
            const member = channel.members.filtered('user.id = $0', currentUserId)[0];

            members[channel.id] = member;
            channels.push(channel);
        });

        const allChannels = filterChannels(
            unreadIds,
            favoriteIds,
            channels,
            unreadsAtTop,
            favoritesAtTop,
        );

        return mapAndSortChannelIds(allChannels, members, options);
    }
);

export const getSortedChannelIds = (options) => {
    const channels = [];

    if (options.grouping === 'by_type') {
        channels.push({
            type: 'public',
            name: 'PUBLIC CHANNELS',
            items: getSortedPublicChannelIds(options),
        });

        channels.push({
            type: 'private',
            name: 'PRIVATE CHANNELS',
            items: getSortedPrivateChannelIds(options),
        });

        channels.push({
            type: 'direct',
            name: 'DIRECT MESSAGES',
            items: getSortedDirectChannelIds(options),
        });
    } else {
        // Combine all channel types
        let type = 'alpha';
        let name = 'CHANNELS';
        if (options.sortingType === 'recent') {
            type = 'recent';
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
            type: 'favorite',
            name: 'FAVORITE CHANNELS',
            items: getSortedFavoriteChannelIds(options),
        });
    }

    if (options.unreadsAtTop) {
        const items = getSortedUnreadChannelIds(options);
        if (items.length) {
            channels.unshift({
                type: 'unreads',
                name: 'UNREADS',
                items,
            });
        }
    }

    if (hasChannelsChanged(channels)) {
        lastChannels = channels;
    }

    return lastChannels;
};

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

function mapAndSortChannelIds(channels, myMembers, options) {
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

    const mutedChannelIds = channels.
        filter((c) => isChannelMuted(myMembers[c.id])).
        sort(sortChannelsByRecencyOrAlpha.bind(null, currentUserId, lang, displayNameSettings, myMembers, sortingType)).
        map((c) => c.id);

    let channelIdsWithMentions = [];
    if (sortMentionsFirst) {
        channelIdsWithMentions = channels.
            filter((c) => {
                const member = myMembers[c.id];
                return member?.mentionCount > 0 && !isChannelMuted(member);
            }).
            sort(sortChannelsByRecencyOrAlpha.bind(null, currentUserId, lang, displayNameSettings, myMembers, sortingType)).
            map((c) => c.id);
    }

    const otherChannelIds = channels.
        filter((c) => {
            return !mutedChannelIds.includes(c.id) && !channelIdsWithMentions.includes(c.id);
        }).
        sort(sortChannelsByRecencyOrAlpha.bind(null, currentUserId, lang, displayNameSettings, myMembers, sortingType)).
        map((c) => c.id);

    return sortMentionsFirst ? channelIdsWithMentions.concat(mutedChannelIds, otherChannelIds) : otherChannelIds.concat(mutedChannelIds);
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
