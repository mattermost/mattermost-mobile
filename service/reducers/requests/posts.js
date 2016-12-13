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

function getPost(state = initialRequestState(), action) {
    return handleRequest(
        PostsTypes.GET_POST_REQUEST,
        PostsTypes.GET_POST_SUCCESS,
        PostsTypes.GET_POST_FAILURE,
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

function getPostsSince(state = initialRequestState(), action) {
    return handleRequest(
        PostsTypes.GET_POSTS_SINCE_REQUEST,
        PostsTypes.GET_POSTS_SINCE_SUCCESS,
        PostsTypes.GET_POSTS_SINCE_FAILURE,
        state,
        action
    );
}

function getPostsBefore(state = initialRequestState(), action) {
    return handleRequest(
        PostsTypes.GET_POSTS_BEFORE_REQUEST,
        PostsTypes.GET_POSTS_BEFORE_SUCCESS,
        PostsTypes.GET_POSTS_BEFORE_FAILURE,
        state,
        action
    );
}

function getPostsAfter(state = initialRequestState(), action) {
    return handleRequest(
        PostsTypes.GET_POSTS_AFTER_REQUEST,
        PostsTypes.GET_POSTS_AFTER_SUCCESS,
        PostsTypes.GET_POSTS_AFTER_FAILURE,
        state,
        action
    );
}

export default combineReducers({
    createPost,
    editPost,
    deletePost,
    getPost,
    getPosts,
    getPostsSince,
    getPostsBefore,
    getPostsAfter
});
