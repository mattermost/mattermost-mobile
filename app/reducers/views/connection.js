// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {UserTypes} from 'mattermost-redux/action_types';
import {ViewTypes} from 'app/constants';

export default function connection(state = true, action) {
    switch (action.type) {
    case ViewTypes.CONNECTION_CHANGED:
        return action.data;

    case UserTypes.LOGOUT_SUCCESS:
        return true;
    }

    return state;
}

