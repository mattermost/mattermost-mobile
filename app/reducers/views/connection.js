// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {UsersTypes} from 'mattermost-redux/constants';
import {ViewTypes} from 'app/constants';

export default function connection(state = true, action) {
    switch (action.type) {
    case ViewTypes.CONNECTION_CHANGED:
        return action.data;

    case UsersTypes.LOGOUT_SUCCESS:
        return true;
    }

    return state;
}

