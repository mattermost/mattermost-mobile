// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import keymirror from 'keymirror';

const PostsTypes = keymirror({
    FETCH_POSTS_REQUEST: null,
    FETCH_POSTS_SUCCESS: null,
    FETCH_POSTS_FAILURE: null,

    RECEIVED_POST: null,
    RECEIVED_POSTS: null,
    RECEIVED_FOCUSED_POST: null,
    RECEIVED_POST_SELECTED: null,
    RECEIVED_EDIT_POST: null,
    CREATE_POST: null,
    CREATE_COMMENT: null,
    POST_DELETED: null,
    REMOVE_POST: null
});

export default PostsTypes;
