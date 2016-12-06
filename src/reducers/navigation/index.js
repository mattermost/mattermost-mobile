// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import * as NavigationStateUtils from 'NavigationStateUtils';

import {UsersTypes, NavigationTypes} from 'constants';

import * as Routes from 'navigation/routes.js';

const initialState = {
    index: 0,
    routes: [
        Routes.Root
    ]
};

export default function(state = initialState, action) {
    switch (action.type) {
    case NavigationTypes.NAVIGATION_PUSH:
        return NavigationStateUtils.push(state, action.route);

    case NavigationTypes.NAVIGATION_POP:
        return NavigationStateUtils.pop(state);

    case NavigationTypes.NAVIGATION_JUMP:
        return NavigationStateUtils.jumpTo(state, action.key);

    case NavigationTypes.NAVIGATION_JUMP_TO_INDEX:
        return NavigationStateUtils.jumpToIndex(state, action.index);

    case NavigationTypes.NAVIGATION_RESET:
        return NavigationStateUtils.reset(state, action.routes, action.index);

    case UsersTypes.LOGOUT_SUCCESS:
        return NavigationStateUtils.reset(state, initialState.routes, initialState.index);

    default:
        return state;
    }
}
