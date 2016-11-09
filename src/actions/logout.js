// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {LogoutTypes} from 'constants';
import Client from 'client/client_instance';
import {bindClientFunc} from 'actions/helpers.js';

export function logout() {
    return bindClientFunc(
        Client.logout,
        LogoutTypes.LOGOUT_REQUEST,
        LogoutTypes.LOGOUT_SUCCESS,
        LogoutTypes.LOGOUT_FAILURE
    );
}
