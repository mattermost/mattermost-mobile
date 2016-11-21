// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';
import {GeneralTypes} from 'constants';

function ping(state = {}, action) {
    switch (action.type) {
    case GeneralTypes.PING_REQUEST:
        return {
            ...action.data,
            loading: true
        };
    case GeneralTypes.PING_SUCCESS:
        return {
            ...action.data,
            loading: false,
            error: null
        };
    case GeneralTypes.PING_FAILURE:
        return {
            ...action.data,
            loading: false,
            error: action.error
        };

    default:
        return state;
    }
}

function clientConfig(state = {}, action) {
    switch (action.type) {
    case GeneralTypes.CLIENT_CONFIG_REQUEST:
        return {
            ...action.data,
            loading: true
        };
    case GeneralTypes.CLIENT_CONFIG_SUCCESS:
        return {
            ...action.data,
            loading: false,
            error: null
        };
    case GeneralTypes.CLIENT_CONFIG_FAILURE:
        return {
            ...action.data,
            loading: false,
            error: action.error
        };

    default:
        return state;
    }
}

export default combineReducers({
    ping,
    clientConfig
});
