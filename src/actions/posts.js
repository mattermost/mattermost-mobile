// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindClientFunc} from './helpers.js';
import Client from 'client/client_instance';
import {PostsTypes as types} from 'constants';

export function fetchPosts(teamId, channelId) {
    Client.setTeamId(teamId);
    return bindClientFunc(
        Client.fetchPosts,
        types.FETCH_POSTS_REQUEST,
        types.FETCH_POSTS_SUCCESS,
        types.FETCH_POSTS_FAILURE,
        channelId
    );
}
