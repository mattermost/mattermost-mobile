// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';

import Config from 'config/config';

import {SelectServerActions} from 'constants/view_actions';

function serverUrl(state = Config.DefaultServerUrl, action) {
    switch (action.type) {
    case SelectServerActions.SERVER_URL_CHANGED:
        return action.serverUrl;

    default:
        return state;
    }
}

export default combineReducers({
    serverUrl
});
