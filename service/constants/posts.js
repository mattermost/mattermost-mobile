// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import keymirror from 'keymirror';

const PostsTypes = keymirror({
    CREATE_POST_REQUEST: null,
    CREATE_POST_SUCCESS: null,
    CREATE_POST_FAILURE: null,

    EDIT_POST_REQUEST: null,
    EDIT_POST_SUCCESS: null,
    EDIT_POST_FAILURE: null,

    DELETE_POST_REQUEST: null,
    DELETE_POST_SUCCESS: null,
    DELETE_POST_FAILURE: null,

    GET_POSTS_REQUEST: null,
    GET_POSTS_SUCCESS: null,
    GET_POSTS_FAILURE: null,

    RECEIVED_POSTS: null,
    RECEIVED_FOCUSED_POST: null,
    RECEIVED_POST_SELECTED: null,
    RECEIVED_EDIT_POST: null,
    POST_DELETED: null,
    REMOVE_POST: null
});

export default PostsTypes;
