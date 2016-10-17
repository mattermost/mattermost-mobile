// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindClientFunc} from './helpers.js';
import Client from 'client/client_instance';
import {PostsTypes as types} from 'constants';

export function fetchPosts(team_id, channel_id) {
    Client.setTeamId(team_id);
    Client.setChannelId(channel_id);
    return bindClientFunc(
        Client.fetchPosts,
        types.FETCH_POSTS_REQUEST,
        types.FETCH_POSTS_SUCCESS,
        types.FETCH_POSTS_FAILURE
    );
}
