// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {NavigationTypes} from 'app/constants';
import {UserTypes} from '@redux/action_types';
import EventEmitter from '@redux/utils/event_emitter';

export default function(state = '', action) {
    switch (action.type) {
    case UserTypes.LOGOUT_SUCCESS:
        setTimeout(() => {
            EventEmitter.emit(NavigationTypes.NAVIGATION_RESET);
        });
        break;
    }

    return state;
}
