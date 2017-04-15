// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.
import {GeneralTypes} from 'mattermost-redux/action_types';

import {ViewTypes} from 'app/constants';
import {Client4} from 'mattermost-redux/client';

export function handleLoginIdChanged(loginId) {
    return async (dispatch, getState) => {
        dispatch({
            type: ViewTypes.LOGIN_ID_CHANGED,
            loginId
        }, getState);
    };
}

export function handlePasswordChanged(password) {
    return async (dispatch, getState) => {
        dispatch({
            type: ViewTypes.PASSWORD_CHANGED,
            password
        }, getState);
    };
}

export function handleSuccessfulLogin() {
    return async (dispatch) => {
        dispatch({
            type: GeneralTypes.RECEIVED_APP_CREDENTIALS,
            data: {
                url: Client4.getUrl(),
                token: Client4.getToken()
            }
        });
    };
}

export default {
    handleLoginIdChanged,
    handlePasswordChanged,
    handleSuccessfulLogin
};
