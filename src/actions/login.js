// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {LoginTypes as types} from 'constants';
import Client from 'client/client_instance';
import {bindClientFunc} from 'actions/helpers.js';

export function login(loginId, password, mfaToken = '') {
    return bindClientFunc(
        Client.login,
        types.LOGIN_REQUEST,
        types.LOGIN_SUCCESS,
        types.LOGIN_FAILURE,
        loginId,
        password,
        mfaToken
    );
}
