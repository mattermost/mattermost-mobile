// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

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

export default {
    handleLoginIdChanged,
    handlePasswordChanged
};
