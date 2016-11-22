// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';

import {LoginActions} from 'constants/view_actions';

function loginId(state = '', action) {
    switch (action.type) {
    case LoginActions.LOGIN_ID_CHANGED:
        return action.loginId;

    default:
        return state;
    }
}

function password(state = '', action) {
    switch (action.type) {
    case LoginActions.PASSWORD_CHANGED:
        return action.password;

    default:
        return state;
    }
}

export default combineReducers({
    loginId,
    password
});
