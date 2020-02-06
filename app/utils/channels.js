// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Preferences} from 'mattermost-redux/constants';
import {getUserIdFromChannelName} from 'mattermost-redux/utils/channel_utils';

export function isDirectChannelVisible(userId, myPreferences, channel) {
    const channelId = getUserIdFromChannelName(userId, channel.name);
    const dm = myPreferences[`${Preferences.CATEGORY_DIRECT_CHANNEL_SHOW}--${channelId}`];
    return dm && dm.value === 'true';
}

export function isGroupChannelVisible(myPreferences, channel) {
    const gm = myPreferences[`${Preferences.CATEGORY_GROUP_CHANNEL_SHOW}--${channel.id}`];
    return gm && gm.value === 'true';
}

export function isFavoriteChannel(preferences, channelId) {
    const fav = preferences[`${Preferences.CATEGORY_FAVORITE_CHANNEL}--${channelId}`];
    return fav ? fav.value === 'true' : false;
}

// New to replace the ones above
export function isDirectMessageVisible(preferences, channelId) {
    const dm = preferences[`${Preferences.CATEGORY_DIRECT_CHANNEL_SHOW}--${channelId}`];
    return dm ? dm.value === 'true' : true;
}

export function isGroupMessageVisible(preferences, channelId) {
    const gm = preferences[`${Preferences.CATEGORY_GROUP_CHANNEL_SHOW}--${channelId}`];
    return gm ? gm.value === 'true' : true;
}

export function isDirectChannelAutoClosed(config, preferences, channelId, channelActivity, channelArchiveTime = 0, currentChannelId = '') {
    // When the config is not set or is a favorite channel
    if (config.CloseUnusedDirectMessages !== 'true' || isFavoriteChannel(preferences, channelId)) {
        return false;
    }

    const cutoff = new Date().getTime() - (7 * 24 * 60 * 60 * 1000);
    const viewTimePref = preferences[`${Preferences.CATEGORY_CHANNEL_APPROXIMATE_VIEW_TIME}--${channelId}`];
    const viewTime = viewTimePref ? parseInt(viewTimePref.value || 0, 10) : 0;

    if (viewTime > cutoff) {
        return false;
    }

    const openTimePref = preferences[`${Preferences.CATEGORY_CHANNEL_OPEN_TIME}--${channelId}`];
    const openTime = openTimePref ? parseInt(openTimePref.value || 0, 10) : 0;

    // Only close archived channels when not being viewed
    if (channelId !== currentChannelId && channelArchiveTime && channelArchiveTime > openTime) {
        return true;
    }

    const autoClose = preferences[`${Preferences.CATEGORY_SIDEBAR_SETTINGS}--close_unused_direct_messages`];
    if (!autoClose || autoClose.value === 'after_seven_days') {
        if (channelActivity && channelActivity > cutoff) {
            return false;
        }
        if (openTime > cutoff) {
            return false;
        }

        return !channelActivity || channelActivity < cutoff;
    }

    return false;
}