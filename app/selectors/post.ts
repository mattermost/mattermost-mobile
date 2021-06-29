// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createSelector} from 'reselect';

import {getChannel} from '@mm-redux/selectors/entities/channels';
import {getCurrentTeamId} from '@mm-redux/selectors/entities/teams';

import type {Post} from '@mm-redux/types/posts';
import type {GlobalState} from '@mm-redux/types/store';

export const teamIdForPost = createSelector(
    getCurrentTeamId,
    (state: GlobalState, post: Post) => getChannel(state, post.channel_id),
    (currentTeamId, channel) => {
        return channel.team_id || currentTeamId;
    },
);
