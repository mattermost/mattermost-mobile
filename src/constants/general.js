// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import keymirror from 'keymirror';

const GeneralTypes = keymirror({
    PING_REQUEST: null,
    PING_SUCCESS: null,
    PING_FAILURE: null,

    CLIENT_CONFIG_REQUEST: null,
    CLIENT_CONFIG_SUCCESS: null,
    CLIENT_CONFIG_FAILURE: null,
    CLIENT_CONFIG_RECEIVED: null,

    CLIENT_LICENSE_REQUEST: null,
    CLIENT_LICENSE_SUCCESS: null,
    CLIENT_LICENSE_FAILURE: null,
    CLIENT_LICENSE_RECEIVED: null,

    LOG_CLIENT_ERROR_REQUEST: null,
    LOG_CLIENT_ERROR_SUCCESS: null,
    LOG_CLIENT_ERROR_FAILURE: null,

    SERVER_URL_CHANGED: null
});

export default GeneralTypes;
