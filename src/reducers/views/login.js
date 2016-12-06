// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';

import {UsersTypes} from 'constants';

function loginId(state = '', action) {
    switch (action.type) {
    case UsersTypes.LOGIN_ID_CHANGED:
        return action.loginId;
    case UsersTypes.LOGOUT_SUCCESS:
        return '';
    default:
        return state;
    }
}

function password(state = '', action) {
    switch (action.type) {
    case UsersTypes.PASSWORD_CHANGED:
        return action.password;
    case UsersTypes.LOGOUT_SUCCESS:
        return '';
    default:
        return state;
    }
}

export default combineReducers({
    loginId,
    password
});
