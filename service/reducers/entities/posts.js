// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {PostsTypes, UsersTypes} from 'service/constants';
import {combineReducers} from 'redux';
import {addPosts, deletePost, removePost} from './helpers';

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
    case PostsTypes.RECEIVED_POSTS:
        return addPosts(state, action);
    case PostsTypes.POST_DELETED:
        return deletePost(state, action);
    case PostsTypes.REMOVE_POST:
        return removePost(state, action);
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
    postsInfo
});
