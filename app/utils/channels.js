// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Preferences} from 'mattermost-redux/constants';

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
