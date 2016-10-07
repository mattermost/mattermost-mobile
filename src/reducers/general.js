// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';
import {initialState, handle} from './helpers.js';
import * as Types from 'actions/general.js';

export function clientConfig(state = initialState(), action) {
    return handle(Types.CLIENT_CONFIG_REQUEST, Types.CLIENT_CONFIG_SUCCESS, Types.CLIENT_CONFIG_FAILURE, state, action);
}

export function ping(state = initialState(), action) {
    return handle(Types.PING_REQUEST, Types.PING_SUCCESS, Types.PING_FAILURE, state, action);
}

export default combineReducers({
    clientConfig,
    ping
});