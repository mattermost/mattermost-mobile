// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';
import {initialState, handle} from './helpers.js';
import * as types from 'constants/base';

export function clientConfig(state = initialState(), action) {
    return handle(
      types.CLIENT_CONFIG_REQUEST,
      types.CLIENT_CONFIG_SUCCESS,
      types.CLIENT_CONFIG_FAILURE,
      state,
      action);
}

export function ping(state = initialState(), action) {
    return handle(
      types.PING_REQUEST,
      types.PING_SUCCESS,
      types.PING_FAILURE,
      state,
      action);
}

export default combineReducers({
    clientConfig,
    ping
});
