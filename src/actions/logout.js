// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {LogoutTypes as types} from 'constants';
import Client from 'client/client_instance';
import {bindClientFunc} from 'actions/helpers.js';

export function logout() {
    return bindClientFunc(
        Client.logout,
        types.LOGOUT_REQUEST,
        types.LOGOUT_SUCCESS,
        types.LOGOUT_FAILURE
    );
}
