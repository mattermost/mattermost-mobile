// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';

import Config from 'config/index';

import {ViewTypes} from 'app/constants';

function serverUrl(state = Config.DefaultServerUrl, action) {
    switch (action.type) {
    case ViewTypes.SERVER_URL_CHANGED:
        return action.serverUrl;

    default:
        return state;
    }
}

export default combineReducers({
    serverUrl
});
