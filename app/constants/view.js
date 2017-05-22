// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import keyMirror from 'mattermost-redux/utils/key_mirror';

const ViewTypes = keyMirror({
    APPLICATION_INITIALIZED: null,

    SERVER_URL_CHANGED: null,

    LOGIN_ID_CHANGED: null,
    PASSWORD_CHANGED: null,

    POST_DRAFT_CHANGED: null,
    COMMENT_DRAFT_CHANGED: null,

    NOTIFICATION_CHANGED: null,
    NOTIFICATION_IN_APP: null,
    NOTIFICATION_TAPPED: null,

    CONNECTION_CHANGED: null,

    SET_POST_DRAFT: null,
    SET_COMMENT_DRAFT: null,

    SET_TEMP_UPLOAD_FILES_FOR_POST_DRAFT: null,
    RETRY_UPLOAD_FILE_FOR_POST: null,

    CLEAR_FILES_FOR_POST_DRAFT: null,

    REMOVE_FILE_FROM_POST_DRAFT: null,
    REMOVE_LAST_FILE_FROM_POST_DRAFT: null,

    ADD_FILE_TO_FETCH_CACHE: null,

    SET_CHANNEL_LOADER: null,
    SET_CHANNEL_REFRESHING: null,

    SET_LAST_CHANNEL_FOR_TEAM: null,

    GITLAB: null,
    SAML: null
});

export default ViewTypes;
