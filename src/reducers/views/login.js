// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';

import {handle, initialState} from 'reducers/helpers.js';

import {LoginActions} from 'constants/view_actions.js';

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

function loginRequest(state = initialState(), action) {
    return handle(
        LoginActions.LOGIN_REQUEST,
        LoginActions.LOGIN_SUCCESS,
        LoginActions.LOGIN_FAILURE,
        state,
        action
    );
}

export default combineReducers({
    loginId,
    password,
    loginRequest
});
