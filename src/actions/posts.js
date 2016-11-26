// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindClientFunc} from './helpers.js';
import Client from 'client';
import {PostsTypes} from 'constants';

export function fetchPosts(teamId, channelId) {
    return bindClientFunc(
        Client.fetchPosts,
        PostsTypes.FETCH_POSTS_REQUEST,
        PostsTypes.FETCH_POSTS_SUCCESS,
        PostsTypes.FETCH_POSTS_FAILURE,
        teamId,
        channelId
    );
}
