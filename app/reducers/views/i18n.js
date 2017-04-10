// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';

import Config from 'assets/config.json';

import {UsersTypes} from 'mattermost-redux/constants';

function locale(state = Config.DefaultLocale, action) {
    switch (action.type) {
    case UsersTypes.RECEIVED_ME:
        return action.data.locale;

    case UsersTypes.LOGOUT_SUCCESS:
        return Config.DefaultLocale;
    }

    return state;
}

export default combineReducers({
    locale
});
