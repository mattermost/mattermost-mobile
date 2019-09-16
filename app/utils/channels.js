// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {General, Preferences} from 'app/constants';
import {displayUserName} from 'app/utils/users';

export function isDirectChannelVisible(userId, myPreferences, channel) {
    const channelId = getUserIdFromChannelName(userId, channel.name);
    const dm = myPreferences[`${Preferences.CATEGORY_DIRECT_CHANNEL_SHOW}--${channelId}`];
    return dm && dm.value === 'true';
}

export function isGroupChannelVisible(myPreferences, channel) {
    const gm = myPreferences[`${Preferences.CATEGORY_GROUP_CHANNEL_SHOW}--${channel.id}`];
    return gm && gm.value === 'true';
}

export function getUserIdFromChannelName(userId, channelName) {
    const ids = channelName.split('__');
    let otherUserId = '';
    if (ids[0] === userId) {
        otherUserId = ids[1];
    } else {
        otherUserId = ids[0];
    }

    return otherUserId;
}

export function sortChannelsByDisplayName(locale, a, b) {
    // if both channels have the display_name defined
    if (a.displayName && b.displayName && a.displayName !== b.displayName) {
        return a.displayName.toLowerCase().localeCompare(b.displayName.toLowerCase(), locale, {numeric: true});
    }

    return a.name.toLowerCase().localeCompare(b.name.toLowerCase(), locale, {numeric: true});
}

export function isChannelMuted(member) {
    return member?.notifyPropsAsJSON?.mark_unread === General.MENTION || false; //eslint-disable-line camelcase
}

export function getChannelDisplayName(channel, currentUserId, teammateNameDisplaySetting) {
    if (channel?.type === General.OPEN_CHANNEL || channel?.type === General.PRIVATE_CHANNEL) {
        return channel.displayName;
    }

    const names = [];
    if (channel?.members?.length) {
        channel.members.forEach((m) => {
            if (m.user.id !== currentUserId) {
                names.push(displayUserName(m.user, teammateNameDisplaySetting));
            }
        });
    }

    return names.join(', ').trim().replace(/,\s*$/, '');
}

export function getDirectChannelName(id, otherId) {
    let handle;

    if (otherId > id) {
        handle = id + '__' + otherId;
    } else {
        handle = otherId + '__' + id;
    }

    return handle;
}

export function isOwnDirectMessage(channel, currentUserId) {
    if (channel?.type === General.DM_CHANNEL) {
        const otherUserId = getUserIdFromChannelName(currentUserId, channel.name);

        return otherUserId === currentUserId;
    }

    return false;
}
