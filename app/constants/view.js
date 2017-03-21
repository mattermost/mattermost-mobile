// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import keyMirror from 'mattermost-redux/utils/key_mirror';

const ViewTypes = keyMirror({
    SERVER_URL_CHANGED: null,

    LOGIN_ID_CHANGED: null,
    PASSWORD_CHANGED: null,

    POST_DRAFT_CHANGED: null,
    COMMENT_DRAFT_CHANGED: null,

    OPTIONS_MODAL_CHANGED: null,

    NOTIFICATION_CHANGED: null,

    SET_POST_DRAFT: null,
    SET_COMMENT_DRAFT: null,

    CLEAR_FILES_FOR_POST_DRAFT: null,

    REMOVE_FILE_FROM_POST_DRAFT: null
});

export default ViewTypes;
