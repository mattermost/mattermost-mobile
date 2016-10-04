// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.
import {combineReducers} from 'redux';
import * as types from '../actions/general';
import {initialState, handle} from './helpers';

export function clientConfig(state = initialState(), action) {
    return handle(types.CLIENT_CONFIG_REQUEST, types.CLIENT_CONFIG_SUCCESS, types.CLIENT_CONFIG_FAILURE, state, action);
}

export function ping(state = initialState(), action) {
    return handle(types.PING_REQUEST, types.PING_SUCCESS, types.PING_FAILURE, state, action);
}

const general = combineReducers({
    clientConfig,
    ping
});

export default general;