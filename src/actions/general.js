// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import Client from 'client/client_instance.js';
import {bindClientFunc} from './helpers.js';
import {GeneralTypes as types} from 'constants';

export function getPing() {
    return bindClientFunc(
        Client.getPing,
        types.PING_REQUEST,
        types.PING_SUCCESS,
        types.PING_FAILURE
    );
}

export function getClientConfig() {
    return bindClientFunc(
        Client.getClientConfig,
        types.CLIENT_CONFIG_REQUEST,
        types.CLIENT_CONFIG_SUCCESS,
        types.CLIENT_CONFIG_FAILURE
    );
}

export function logClientError(message, level = 'ERROR') {
    return bindClientFunc(
        Client.logClientError,
        types.LOG_CLIENT_ERROR_REQUEST,
        types.LOG_CLIENT_ERROR_SUCCESS,
        types.LOG_CLIENT_ERROR_FAILURE,
        message,
        level
    );
}
