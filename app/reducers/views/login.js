// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';
import {UsersTypes} from 'service/constants';
import {UsersViewTypes} from 'app/constants';

function loginId(state = '', action) {
    switch (action.type) {
    case UsersViewTypes.LOGIN_ID_CHANGED:
        return action.loginId;
    case UsersTypes.LOGOUT_SUCCESS:
        return '';
    default:
        return state;
    }
}

function password(state = '', action) {
    switch (action.type) {
    case UsersViewTypes.PASSWORD_CHANGED:
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
