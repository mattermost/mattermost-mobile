// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import Client from 'service/client';
import {batchActions} from 'redux-batched-actions';
import {bindClientFunc, forceLogoutIfNecessary} from './helpers';
import {Constants, PostsTypes} from 'service/constants';

export function createPost(teamId, post) {
    return bindClientFunc(
        Client.createPost,
        PostsTypes.CREATE_POST_REQUEST,
        [PostsTypes.RECEIVED_POST, PostsTypes.CREATE_POST_SUCCESS],
        PostsTypes.CREATE_POST_FAILURE,
        teamId,
        post
    );
}

export function editPost(teamId, post) {
    return bindClientFunc(
        Client.editPost,
        PostsTypes.EDIT_POST_REQUEST,
        [PostsTypes.RECEIVED_POST, PostsTypes.EDIT_POST_SUCCESS],
        PostsTypes.EDIT_POST_FAILURE,
        teamId,
        post
    );
}

export function deletePost(teamId, post) {
    return async (dispatch, getState) => {
        try {
            dispatch({type: PostsTypes.DELETE_POST_REQUEST}, getState);

            await Client.deletePost(teamId, post.channel_id, post.id);
            dispatch(batchActions([
                {
                    type: PostsTypes.POST_DELETED,
                    data: post
                },
                {
                    type: PostsTypes.DELETE_POST_SUCCESS
                }
            ]), getState);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch);
            dispatch({type: PostsTypes.DELETE_POST_FAILURE, error}, getState);
        }
    };
}

export function removePost(post) {
    return async (dispatch, getState) => {
        dispatch({
            type: PostsTypes.REMOVE_POST,
            data: post
        }, getState);
    };
}

export function getPost(teamId, channelId, postId) {
    return async (dispatch, getState) => {
        try {
            dispatch({type: PostsTypes.GET_POST_REQUEST}, getState);
            const post = await Client.getPost(teamId, channelId, postId);
            dispatch(batchActions([
                {
                    type: PostsTypes.RECEIVED_POSTS,
                    data: post,
                    channelId
                },
                {
                    type: PostsTypes.GET_POST_SUCCESS
                }
            ]), getState);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch);
            dispatch({type: PostsTypes.GET_POST_FAILURE, error}, getState);
        }
    };
}

export function getPosts(teamId, channelId, offset = 0, limit = Constants.POST_CHUNK_SIZE) {
    return async (dispatch, getState) => {
        try {
            dispatch({type: PostsTypes.GET_POSTS_REQUEST}, getState);
            const posts = await Client.getPosts(teamId, channelId, offset, limit);
            dispatch(batchActions([
                {
                    type: PostsTypes.RECEIVED_POSTS,
                    data: posts,
                    channelId
                },
                {
                    type: PostsTypes.GET_POSTS_SUCCESS
                }
            ]), getState);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch);
            dispatch({type: PostsTypes.GET_POSTS_FAILURE, error}, getState);
        }
    };
}

export function getPostsSince(teamId, channelId, since) {
    return async (dispatch, getState) => {
        try {
            dispatch({type: PostsTypes.GET_POSTS_SINCE_REQUEST}, getState);
            const posts = await Client.getPostsSince(teamId, channelId, since);
            dispatch(batchActions([
                {
                    type: PostsTypes.RECEIVED_POSTS,
                    data: posts,
                    channelId
                },
                {
                    type: PostsTypes.GET_POSTS_SINCE_SUCCESS
                }
            ]), getState);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch);
            dispatch({type: PostsTypes.GET_POSTS_SINCE_FAILURE, error}, getState);
        }
    };
}

export function getPostsBefore(teamId, channelId, postId, offset = 0, limit = Constants.POST_CHUNK_SIZE) {
    return async (dispatch, getState) => {
        try {
            dispatch({type: PostsTypes.GET_POSTS_BEFORE_REQUEST}, getState);
            const posts = await Client.getPostsBefore(teamId, channelId, postId, offset, limit);
            dispatch(batchActions([
                {
                    type: PostsTypes.RECEIVED_POSTS,
                    data: posts,
                    channelId
                },
                {
                    type: PostsTypes.GET_POSTS_BEFORE_SUCCESS
                }
            ]), getState);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch);
            dispatch({type: PostsTypes.GET_POSTS_BEFORE_FAILURE, error}, getState);
        }
    };
}

export function getPostsAfter(teamId, channelId, postId, offset = 0, limit = Constants.POST_CHUNK_SIZE) {
    return async (dispatch, getState) => {
        try {
            dispatch({type: PostsTypes.GET_POSTS_AFTER_REQUEST}, getState);
            const posts = await Client.getPostsAfter(teamId, channelId, postId, offset, limit);
            dispatch(batchActions([
                {
                    type: PostsTypes.RECEIVED_POSTS,
                    data: posts,
                    channelId
                },
                {
                    type: PostsTypes.GET_POSTS_AFTER_SUCCESS
                }
            ]), getState);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch);
            dispatch({type: PostsTypes.GET_POSTS_AFTER_FAILURE, error}, getState);
        }
    };
}

export default {
    createPost,
    editPost,
    deletePost,
    removePost,
    getPost,
    getPosts,
    getPostsSince,
    getPostsBefore,
    getPostsAfter
};
