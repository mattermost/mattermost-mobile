// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {UsersTypes} from 'constants';

export function handleLoginIdChanged(loginId) {
    return async (dispatch, getState) => {
        dispatch({
            type: UsersTypes.LOGIN_ID_CHANGED,
            loginId
        }, getState);
    };
}

export function handlePasswordChanged(password) {
    return async (dispatch, getState) => {
        dispatch({
            type: UsersTypes.PASSWORD_CHANGED,
            password
        }, getState);
    };
}

export default {
    handleLoginIdChanged,
    handlePasswordChanged
};
