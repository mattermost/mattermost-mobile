// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import Client from 'client/client_instance.js';
import {bindClientFunc} from 'actions/helpers.js';

import {LoginActions} from 'constants/view_actions.js';

export function handleLoginIdChanged(loginId) {
    return async (dispatch, getState) => {
        dispatch({
            type: LoginActions.LOGIN_ID_CHANGED,
            loginId
        }, getState);
    };
}

export function handlePasswordChanged(password) {
    return async (dispatch, getState) => {
        dispatch({
            type: LoginActions.PASSWORD_CHANGED,
            password
        }, getState);
    };
}

export function login(loginId, password, mfaToken = '') {
    return bindClientFunc(
        Client.login,
        LoginActions.LOGIN_REQUEST,
        LoginActions.LOGIN_SUCCESS,
        LoginActions.LOGIN_FAILURE,
        loginId,
        password,
        mfaToken
    );
}

export default {
    handleLoginIdChanged,
    handlePasswordChanged,
    login
};
