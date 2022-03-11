// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import keyMirror from '@utils/key_mirror';

export const POSTS = keyMirror({
    RECEIVED_IN_CHANNEL: null,
    RECEIVED_IN_THREAD: null,
    RECEIVED_SINCE: null,
    RECEIVED_AFTER: null,
    RECEIVED_BEFORE: null,
    RECEIVED_NEW: null,
});

export default {
    POSTS,
};
