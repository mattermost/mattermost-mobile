// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {NavigationExperimental} from 'react-native';

import {UsersTypes} from 'service/constants';
import {NavigationTypes} from 'app/constants';

import Routes from 'app/navigation/routes';

const initialState = {
    index: -1,
    routes: []
};

export default function(state = initialState, action) {
    switch (action.type) {
    case NavigationTypes.NAVIGATION_PUSH:
        return NavigationExperimental.StateUtils.push(state, action.route);

    case NavigationTypes.NAVIGATION_POP:
        return NavigationExperimental.StateUtils.pop(state);

    case NavigationTypes.NAVIGATION_JUMP:
        return NavigationExperimental.StateUtils.jumpTo(state, action.key);

    case NavigationTypes.NAVIGATION_JUMP_TO_INDEX:
        return NavigationExperimental.StateUtils.jumpToIndex(state, action.index);

    case NavigationTypes.NAVIGATION_RESET:
        return NavigationExperimental.StateUtils.reset(state, action.routes, action.index);

    case UsersTypes.LOGOUT_SUCCESS:
        return NavigationExperimental.StateUtils.reset(state, [Routes.Root], 0);

    default:
        return state;
    }
}
