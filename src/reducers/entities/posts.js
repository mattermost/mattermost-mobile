// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {PostsTypes, UsersTypes} from 'constants';
import {combineReducers} from 'redux';
import {addPosts} from './helpers';

function selectedPostId(state = '', action) {
    switch (action.type) {
    case UsersTypes.LOGOUT_SUCCESS:
        return '';
    default:
        return state;
    }
}

function currentFocusedPostId(state = '', action) {
    switch (action.type) {
    case UsersTypes.LOGOUT_SUCCESS:
        return '';
    default:
        return state;
    }
}

function postsInfo(state = {}, action) {
    switch (action.type) {
    case PostsTypes.FETCH_POSTS_SUCCESS:
        return addPosts(state, action);
    case UsersTypes.LOGOUT_SUCCESS:
        return {};
    default:
        return state;
    }
}

function latestPageTime(state = {}, action) {
    switch (action.type) {
    case UsersTypes.LOGOUT_SUCCESS:
        return {};
    default:
        return state;
    }
}

export default combineReducers({

    // the current selected post
    selectedPostId,

    // the current selected focused post (permalink view)
    currentFocusedPostId,

    // object where every key is the channel id and has and object with the postList
    postsInfo,

    // object where the every key is the channel id and has the timestamp of the latest post created in that channel
    latestPageTime
});
