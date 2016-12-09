// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {UsersViewTypes} from 'app/constants';

export function handleLoginIdChanged(loginId) {
    return async (dispatch, getState) => {
        dispatch({
            type: UsersViewTypes.LOGIN_ID_CHANGED,
            loginId
        }, getState);
    };
}

export function handlePasswordChanged(password) {
    return async (dispatch, getState) => {
        dispatch({
            type: UsersViewTypes.PASSWORD_CHANGED,
            password
        }, getState);
    };
}

export default {
    handleLoginIdChanged,
    handlePasswordChanged
};
