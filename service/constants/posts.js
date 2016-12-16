// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import keyMirror from 'service/utils/key_mirror';

const PostsTypes = keyMirror({
    CREATE_POST_REQUEST: null,
    CREATE_POST_SUCCESS: null,
    CREATE_POST_FAILURE: null,

    EDIT_POST_REQUEST: null,
    EDIT_POST_SUCCESS: null,
    EDIT_POST_FAILURE: null,

    DELETE_POST_REQUEST: null,
    DELETE_POST_SUCCESS: null,
    DELETE_POST_FAILURE: null,

    GET_POST_REQUEST: null,
    GET_POST_SUCCESS: null,
    GET_POST_FAILURE: null,

    GET_POSTS_REQUEST: null,
    GET_POSTS_SUCCESS: null,
    GET_POSTS_FAILURE: null,

    GET_POSTS_SINCE_REQUEST: null,
    GET_POSTS_SINCE_SUCCESS: null,
    GET_POSTS_SINCE_FAILURE: null,

    GET_POSTS_BEFORE_REQUEST: null,
    GET_POSTS_BEFORE_SUCCESS: null,
    GET_POSTS_BEFORE_FAILURE: null,

    GET_POSTS_AFTER_REQUEST: null,
    GET_POSTS_AFTER_SUCCESS: null,
    GET_POSTS_AFTER_FAILURE: null,

    RECEIVED_POST: null,
    RECEIVED_POSTS: null,
    RECEIVED_FOCUSED_POST: null,
    RECEIVED_POST_SELECTED: null,
    RECEIVED_EDIT_POST: null,
    POST_DELETED: null,
    REMOVE_POST: null
});

export default PostsTypes;
