// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import Client from 'service/client';
import {bindClientFunc} from './helpers.js';
import {GeneralTypes} from 'service/constants';

export function getPing() {
    return bindClientFunc(
        Client.getPing,
        GeneralTypes.PING_REQUEST,
        GeneralTypes.PING_SUCCESS,
        GeneralTypes.PING_FAILURE
    );
}

export function getClientConfig() {
    return bindClientFunc(
        Client.getClientConfig,
        GeneralTypes.CLIENT_CONFIG_REQUEST,
        [GeneralTypes.CLIENT_CONFIG_RECEIVED, GeneralTypes.CLIENT_CONFIG_SUCCESS],
        GeneralTypes.CLIENT_CONFIG_FAILURE
    );
}

export function getLicenseConfig() {
    return bindClientFunc(
        Client.getLicenseConfig,
        GeneralTypes.CLIENT_LICENSE_REQUEST,
        [GeneralTypes.CLIENT_LICENSE_RECEIVED, GeneralTypes.CLIENT_LICENSE_SUCCESS],
        GeneralTypes.CLIENT_LICENSE_FAILURE
    );
}

export function logClientError(message, level = 'ERROR') {
    return bindClientFunc(
        Client.logClientError,
        GeneralTypes.LOG_CLIENT_ERROR_REQUEST,
        GeneralTypes.LOG_CLIENT_ERROR_SUCCESS,
        GeneralTypes.LOG_CLIENT_ERROR_FAILURE,
        message,
        level
    );
}
