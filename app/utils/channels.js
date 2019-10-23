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
