// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.
import {GeneralTypes} from 'mattermost-redux/action_types';
import {Client4} from 'mattermost-redux/client';

import {ViewTypes} from 'app/constants';

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
    return async (dispatch, getState) => {
        const {currentUserId} = getState().entities.users;
        const token = Client4.getToken();
        const session = await Client4.getSessions(currentUserId, token);

        dispatch({
            type: GeneralTypes.RECEIVED_APP_CREDENTIALS,
            data: {
                url: Client4.getUrl(),
                token
            }
        });

        if (Array.isArray(session) && session[0]) {
            const s = session[0];
            return s.expires_at;
        }

        return false;
    };
}

export default {
    handleLoginIdChanged,
    handlePasswordChanged,
    handleSuccessfulLogin
};
