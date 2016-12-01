// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {NavigationTypes} from 'constants';
import * as Routes from 'navigation/routes';

export function goBack() {
    return async (dispatch, getState) => {
        dispatch({
            type: NavigationTypes.NAVIGATION_POP
        }, getState);
    };
}

export function goToLogin() {
    return async (dispatch, getState) => {
        dispatch({
            type: NavigationTypes.NAVIGATION_PUSH,
            route: Routes.Login
        }, getState);
    };
}

export function goToSelectTeam() {
    return async (dispatch, getState) => {
        dispatch({
            type: NavigationTypes.NAVIGATION_PUSH,
            route: Routes.SelectTeam
        }, getState);
    };
}

export function goToChannel() {
    return async (dispatch, getState) => {
        dispatch({
            type: NavigationTypes.NAVIGATION_PUSH,
            route: Routes.Channel
        }, getState);
    };
}
