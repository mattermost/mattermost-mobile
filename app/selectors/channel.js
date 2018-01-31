// Copyright (c) 2018-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

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
