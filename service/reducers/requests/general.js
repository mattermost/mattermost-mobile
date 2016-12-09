// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';
import {GeneralTypes} from 'service/constants';
import {handleRequest, initialRequestState} from './helpers';

function server(state = initialRequestState(), action) {
    return handleRequest(
        GeneralTypes.PING_REQUEST,
        GeneralTypes.PING_SUCCESS,
        GeneralTypes.PING_FAILURE,
        state,
        action
    );
}

function config(state = initialRequestState(), action) {
    return handleRequest(
        GeneralTypes.CLIENT_CONFIG_REQUEST,
        GeneralTypes.CLIENT_CONFIG_SUCCESS,
        GeneralTypes.CLIENT_CONFIG_FAILURE,
        state,
        action
    );
}

function license(state = initialRequestState(), action) {
    return handleRequest(
        GeneralTypes.CLIENT_LICENSE_REQUEST,
        GeneralTypes.CLIENT_LICENSE_SUCCESS,
        GeneralTypes.CLIENT_LICENSE_FAILURE,
        state,
        action
    );
}

export default combineReducers({
    server,
    config,
    license
});
