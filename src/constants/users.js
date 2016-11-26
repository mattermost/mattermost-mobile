// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import keymirror from 'keymirror';

const UserTypes = keymirror({
    LOGIN_ID_CHANGED: null,
    PASSWORD_CHANGED: null,

    LOGIN_REQUEST: null,
    LOGIN_SUCCESS: null,
    LOGIN_FAILURE: null,

    LOGOUT_REQUEST: null,
    LOGOUT_SUCCESS: null,
    LOGOUT_FAILURE: null,

    RECEIVED_ME: null,
    RECEIVED_PROFLES: null,
    RECEIVED_PROFILES_IN_TEAM: null,
    RECEIVED_PROFILES_IN_CHANNEL: null,
    RECEIVED_SESSIONS: null,
    RECEIVED_AUDITS: null,
    RECEIVED_STATUSES: null,
    RECEIVED_PREFERENCE: null,
    RECEIVED_PREFERENCES: null,
    DELETED_PREFERENCES: null

});

export default UserTypes;
