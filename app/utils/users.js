// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
// @flow

import {getCurrentUserId} from '@mm-redux/selectors/entities/users';
import {getMyChannelMemberships} from '@mm-redux/selectors/entities/channels';
import {getMyPreferences} from '@mm-redux/selectors/entities/preferences';
import {getConfig} from '@mm-redux/selectors/entities/general';

import {
    isArchivedChannel,
    isDirectChannel,
    isDirectChannelVisible,
    isGroupChannel,
    isGroupChannelVisible,
} from '@utils/channels';

export function isInRole(roles, inRole) {
    if (roles) {
        const parts = roles.split(' ');
        for (let i = 0; i < parts.length; i++) {
            if (parts[i] === inRole) {
                return true;
            }
        }
    }

    return false;
}

export function isGuest(user) {
    if (user && user.roles && isInRole(user.roles, 'system_guest')) {
        return true;
    }
    return false;
}

export function canSelectChannel(state, channel) {
    const config = getConfig(state);
    const currentUserId = getCurrentUserId(state);
    const preferences = getMyPreferences(state);
    const members = getMyChannelMemberships(state);

    if (!channel) {
        return false;
    }

    const canViewArchivedChannels = config.ExperimentalViewArchivedChannels === 'true';
    if (isArchivedChannel(channel) && !canViewArchivedChannels) {
        return false;
    }

    if (isDirectChannel(channel) && !isDirectChannelVisible(currentUserId, preferences, channel)) {
        return false;
    }

    if (isGroupChannel(channel) && !isGroupChannelVisible(preferences, channel)) {
        return false;
    }

    if (!members[channel.id]) {
        return false;
    }

    return true;
}
