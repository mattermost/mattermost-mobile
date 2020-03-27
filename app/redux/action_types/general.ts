// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import keyMirror from '@mm-redux/utils/key_mirror';

export default keyMirror({
    RECEIVED_APP_STATE: null,
    RECEIVED_APP_CREDENTIALS: null,
    REMOVED_APP_CREDENTIALS: null,
    RECEIVED_APP_DEVICE_TOKEN: null,

    PING_RESET: null,

    RECEIVED_SERVER_VERSION: null,

    CLIENT_CONFIG_RECEIVED: null,
    CLIENT_CONFIG_RESET: null,

    CLIENT_LICENSE_RECEIVED: null,
    CLIENT_LICENSE_RESET: null,

    RECEIVED_DATA_RETENTION_POLICY: null,

    LOG_CLIENT_ERROR_REQUEST: null,
    LOG_CLIENT_ERROR_SUCCESS: null,
    LOG_CLIENT_ERROR_FAILURE: null,

    SUPPORTED_TIMEZONES_REQUEST: null,
    SUPPORTED_TIMEZONES_SUCCESS: null,
    SUPPORTED_TIMEZONES_FAILURE: null,
    SUPPORTED_TIMEZONES_RECEIVED: null,

    WEBSOCKET_REQUEST: null,
    WEBSOCKET_SUCCESS: null,
    WEBSOCKET_FAILURE: null,
    WEBSOCKET_CLOSED: null,

    REDIRECT_LOCATION_SUCCESS: null,
    REDIRECT_LOCATION_FAILURE: null,
    SET_CONFIG_AND_LICENSE: null,
});
