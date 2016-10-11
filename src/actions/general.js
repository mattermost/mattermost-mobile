// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import Client from 'client/client_instance.js';
import {bindClientFunc} from './helpers.js';

export const PING_REQUEST = 'PING_REQUEST';
export const PING_SUCCESS = 'PING_SUCCESS';
export const PING_FAILURE = 'PING_FAILURE';

export function getPing() {
    return bindClientFunc(
        Client.getPing,
        PING_REQUEST,
        PING_SUCCESS,
        PING_FAILURE
    );
}

export const CLIENT_CONFIG_REQUEST = 'CLIENT_CONFIG_REQUEST';
export const CLIENT_CONFIG_SUCCESS = 'CLIENT_CONFIG_SUCCESS';
export const CLIENT_CONFIG_FAILURE = 'CLIENT_CONFIG_FAILURE';

export function getClientConfig() {
    return bindClientFunc(
        Client.getClientConfig,
        CLIENT_CONFIG_REQUEST,
        CLIENT_CONFIG_SUCCESS,
        CLIENT_CONFIG_FAILURE
    );
}

export const LOG_CLIENT_ERROR_REQUEST = 'LOG_CLIENT_ERROR_REQUEST';
export const LOG_CLIENT_ERROR_SUCCESS = 'LOG_CLIENT_ERROR_SUCCESS';
export const LOG_CLIENT_ERROR_FAILURE = 'LOG_CLIENT_ERROR_FAILURE';

export function logClientError(message, level = 'ERROR') {
    return bindClientFunc(
        Client.logClientError,
        LOG_CLIENT_ERROR_REQUEST,
        LOG_CLIENT_ERROR_SUCCESS,
        LOG_CLIENT_ERROR_FAILURE,
        message,
        level
    );
}