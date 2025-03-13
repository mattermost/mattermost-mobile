// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import keyMirror from '@utils/key_mirror';

export const POSTS = keyMirror({
    RECEIVED_IN_CHANNEL: null,
    RECEIVED_IN_THREAD: null,
    RECEIVED_SINCE: null,
    RECEIVED_AFTER: null,
    RECEIVED_BEFORE: null,
    RECEIVED_AROUND: null,
    RECEIVED_NEW: null,
    RECEIVED_POST_THREAD: null,
});

export const SCHEDULED_POSTS = keyMirror({
    RECEIVED_ALL_SCHEDULED_POSTS: null,
    CREATE_OR_UPDATED_SCHEDULED_POST: null,
    DELETE_SCHEDULED_POST: null,
});

export default {
    POSTS,
    SCHEDULED_POSTS,
};
