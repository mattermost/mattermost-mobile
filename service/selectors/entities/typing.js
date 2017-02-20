// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {createSelector} from 'reselect';
import {getCurrentChannelId} from './channels';
import {getMyPreferences} from './preferences';
import {getUsers} from './users';
import {displayUsername} from 'service/utils/user_utils';

export const getUsersTyping = createSelector(
    getUsers,
    getMyPreferences,
    getCurrentChannelId,
    (state) => state.entities.posts.selectedPostId,
    (state) => state.entities.typing,
    (profiles, preferences, channelId, parentPostId, typing) => {
        const id = channelId + parentPostId;

        if (typing[id]) {
            const users = Object.keys(typing[id]);

            if (users.length) {
                return users.map((userId) => {
                    return displayUsername(profiles[userId], preferences);
                });
            }
        }

        return [];
    }
);
