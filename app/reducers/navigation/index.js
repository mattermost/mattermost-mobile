// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {NavigationExperimental} from 'react-native';

import {UsersTypes} from 'service/constants';
import {NavigationTypes} from 'app/constants';

import Routes from 'app/navigation/routes';

const initialState = {
    index: 0,
    routes: [
        Routes.Root
    ],
    leftDrawerOpen: false,
    leftDrawerRoute: null,
    rightDrawerOpen: false,
    rightDrawerRoute: null
};

export default function(state = initialState, action) {
    switch (action.type) {
    case NavigationTypes.NAVIGATION_PUSH:
        return NavigationExperimental.StateUtils.push(state, action.route);

    case NavigationTypes.NAVIGATION_POP:
        if (state.leftDrawerOpen || state.rightDrawerOpen) {
            return {
                ...state,
                leftDrawerOpen: false,
                rightDrawerOpen: false
            };
        }

        return NavigationExperimental.StateUtils.pop(state);

    case NavigationTypes.NAVIGATION_OPEN_LEFT_DRAWER:
        return {
            ...state,
            leftDrawerOpen: true,
            leftDrawerRoute: action.route
        };

    case NavigationTypes.NAVIGATION_OPEN_RIGHT_DRAWER:
        return {
            ...state,
            rightDrawerOpen: true,
            rightDrawerRoute: action.route
        };

    case NavigationTypes.NAVIGATION_CLOSE_DRAWERS:
        return {
            ...state,
            leftDrawerOpen: false,
            rightDrawerOpen: false
        };

    case NavigationTypes.NAVIGATION_JUMP:
        return NavigationExperimental.StateUtils.jumpTo(state, action.key);

    case NavigationTypes.NAVIGATION_JUMP_TO_INDEX:
        return NavigationExperimental.StateUtils.jumpToIndex(state, action.index);

    case NavigationTypes.NAVIGATION_RESET:
        return {
            ...state,
            ...NavigationExperimental.StateUtils.reset(state, action.routes, action.index),
            leftDrawerOpen: false,
            rightDrawerOpen: false
        };

    case NavigationTypes.NAVIGATION_REPLACE:
        return NavigationExperimental.StateUtils.replaceAtIndex(state, state.index, action.route);

    case UsersTypes.LOGOUT_SUCCESS:
        return NavigationExperimental.StateUtils.reset(state, initialState.routes, initialState.index);

    default:
        return state;
    }
}
