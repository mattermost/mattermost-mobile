// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {NavigationExperimental} from 'react-native';

import {UsersTypes} from 'mattermost-redux/constants';
import {NavigationTypes} from 'app/constants';

import Routes from 'app/navigation/routes';

const initialState = {
    index: 0,
    routes: [
        Routes.Root
    ],
    modal: {
        index: 0,
        requestClose: false,
        routes: []
    },
    isModal: false,
    leftDrawerOpen: false,
    leftDrawerRoute: null,
    rightDrawerOpen: false,
    rightDrawerRoute: null,
    shouldRenderDrawer: false
};

export default function(state = initialState, action) {
    switch (action.type) {
    case NavigationTypes.NAVIGATION_PUSH: {
        if (state.isModal) {
            const modalState = NavigationExperimental.StateUtils.push(state.modal, {props: action.props, ...action.route});
            return {
                ...state,
                modal: modalState
            };
        }
        return NavigationExperimental.StateUtils.push(state, action.route);
    }

    case NavigationTypes.NAVIGATION_POP:
        if (!state.isModal && (state.leftDrawerOpen || state.rightDrawerOpen)) {
            return {
                ...state,
                leftDrawerOpen: false,
                rightDrawerOpen: false
            };
        }

        if (state.isModal) {
            const nextModalState = state.modal.routes.length > 1 ?
                NavigationExperimental.StateUtils.pop(state.modal) :
            {
                index: 0,
                routes: []
            };

            nextModalState.requestClose = false;

            const isModal = nextModalState.routes.length > 0;
            return {
                ...state,
                modal: nextModalState,
                isModal
            };
        }

        return NavigationExperimental.StateUtils.pop(state);

    case NavigationTypes.NAVIGATION_POP_TO_INDEX: {
        let newState = {...state};

        if (!newState.isModal && (newState.leftDrawerOpen || newState.rightDrawerOpen)) {
            newState = {
                ...newState,
                leftDrawerOpen: false,
                rightDrawerOpen: false
            };
        }

        if (newState.isModal) {
            newState = {
                ...newState,
                modal: {
                    index: 0,
                    routes: []
                },
                isModal: false
            };
        }

        if (action.index === newState.index || action.index > newState.routes.length - 1) {
            return newState;
        }

        const nextRoutes = newState.routes.slice(0, action.index + 1);

        return {
            ...newState,
            index: action.index,
            routes: nextRoutes
        };
    }

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

    case NavigationTypes.NAVIGATION_JUMP: {
        if (state.isModal) {
            const modalState = NavigationExperimental.StateUtils.jumpTo(state.modal, action.key);
            return {
                ...state,
                modal: modalState
            };
        }

        return NavigationExperimental.StateUtils.jumpTo(state, action.key);
    }

    case NavigationTypes.NAVIGATION_JUMP_TO_INDEX: {
        if (state.isModal) {
            const modalState = NavigationExperimental.StateUtils.jumpToIndex(state.modal, action.index);
            return {
                ...state,
                modal: modalState
            };
        }

        return NavigationExperimental.StateUtils.jumpToIndex(state, action.index);
    }

    case NavigationTypes.NAVIGATION_RESET:
        return {
            ...state,
            ...NavigationExperimental.StateUtils.reset(state, action.routes),
            modal: {
                index: 0,
                requestClose: false,
                routes: []
            },
            isModal: false,
            leftDrawerOpen: false,
            rightDrawerOpen: false
        };

    case NavigationTypes.NAVIGATION_REPLACE: {
        if (state.isModal) {
            const modalState = NavigationExperimental.StateUtils.replaceAtIndex(state.modal, state.modal.index, action.index);
            return {
                ...state,
                modal: modalState
            };
        }

        return NavigationExperimental.StateUtils.replaceAtIndex(state, state.index, action.route);
    }

    case NavigationTypes.NAVIGATION_REPLACE_AT_ROOT:
        return NavigationExperimental.StateUtils.replaceAtIndex(state, state.index, action.route);

    case NavigationTypes.NAVIGATION_MODAL: {
        const modal = {
            index: 0,
            routes: [
                {
                    ...action.route
                }
            ]
        };
        return {
            ...state,
            modal,
            isModal: true
        };
    }

    case NavigationTypes.NAVIGATION_CLOSE_MODAL:
        return {
            ...state,
            modal: {
                index: 0,
                requestClose: false,
                routes: []
            },
            isModal: false
        };

    case NavigationTypes.NAVIGATION_REQUEST_CLOSE_MODAL: {
        const modalState = Object.assign({}, state.modal, {requestClose: true});

        return {
            ...state,
            modal: modalState
        };
    }

    case NavigationTypes.NAVIGATION_RENDER_LEFT_DRAWER: {
        return {
            ...state,
            shouldRenderDrawer: action.data
        };
    }

    case UsersTypes.LOGOUT_SUCCESS:
        return NavigationExperimental.StateUtils.reset(state, initialState.routes, initialState.index);

    default:
        return state;
    }
}
