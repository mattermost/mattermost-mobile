// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {NavigationTypes} from 'app/constants';
import {UserTypes} from 'mattermost-redux/action_types';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

export default function(state = '', action) {
    switch (action.type) {
    case UserTypes.LOGOUT_SUCCESS:
        EventEmitter.emit(NavigationTypes.NAVIGATION_RESET);
        break;
    }

    return state;
}
