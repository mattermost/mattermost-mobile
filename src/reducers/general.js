// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';
import {handle, initialState} from './helpers';
import {GeneralTypes} from 'constants';

function ping(state = initialState(), action) {
    return handle(
        GeneralTypes.PING_REQUEST,
        GeneralTypes.PING_SUCCESS,
        GeneralTypes.PING_FAILURE,
        state,
        action
    );
}

function clientConfig(state = initialState(), action) {
    return handle(
        GeneralTypes.CLIENT_CONFIG_REQUEST,
        GeneralTypes.CLIENT_CONFIG_SUCCESS,
        GeneralTypes.CLIENT_CONFIG_FAILURE,
        state,
        action
    );
}

export default combineReducers({
    ping,
    clientConfig
});
