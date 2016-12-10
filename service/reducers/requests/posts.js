// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {handleRequest, initialRequestState} from './helpers';
import {PostsTypes} from 'service/constants';

import {combineReducers} from 'redux';

function createPost(state = initialRequestState(), action) {
    return handleRequest(
        PostsTypes.CREATE_POST_REQUEST,
        PostsTypes.CREATE_POST_SUCCESS,
        PostsTypes.CREATE_POST_FAILURE,
        state,
        action
    );
}

function editPost(state = initialRequestState(), action) {
    return handleRequest(
        PostsTypes.EDIT_POST_REQUEST,
        PostsTypes.EDIT_POST_SUCCESS,
        PostsTypes.EDIT_POST_FAILURE,
        state,
        action
    );
}

function deletePost(state = initialRequestState(), action) {
    return handleRequest(
        PostsTypes.DELETE_POST_REQUEST,
        PostsTypes.DELETE_POST_SUCCESS,
        PostsTypes.DELETE_POST_FAILURE,
        state,
        action
    );
}

function getPosts(state = initialRequestState(), action) {
    return handleRequest(
        PostsTypes.GET_POSTS_REQUEST,
        PostsTypes.GET_POSTS_SUCCESS,
        PostsTypes.GET_POSTS_FAILURE,
        state,
        action
    );
}

export default combineReducers({
    createPost,
    editPost,
    deletePost,
    getPosts
});
