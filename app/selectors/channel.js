// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createSelector} from 'reselect';

import {getCurrentUserId, getUser} from 'mattermost-redux/selectors/entities/users';

const getOtherUserIdForDm = createSelector(
    (state, channel) => channel,
    getCurrentUserId,
    (channel, currentUserId) => {
        if (!channel) {
            return '';
        }

        return channel.name.split('__').find((m) => m !== currentUserId) || currentUserId;
    }
);

export const getChannelMembersForDm = createSelector(
    (state, channel) => getUser(state, getOtherUserIdForDm(state, channel)),
    (otherUser) => {
        if (!otherUser) {
            return [];
        }

        return [otherUser];
    }
);

export const getChannelNameForSearchAutocomplete = createSelector(
    (state, channelId) => state.entities.channels.channels[channelId],
    (channel) => {
        if (channel && channel.display_name) {
            return channel.display_name;
        }
        return '';
    }
);
