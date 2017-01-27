// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {NavigationTypes} from 'app/constants';
import Routes from 'app/navigation/routes';

export function goBack() {
    return async (dispatch, getState) => {
        dispatch({
            type: NavigationTypes.NAVIGATION_POP
        }, getState);
    };
}

export function closeDrawers() {
    return async (dispatch, getState) => {
        dispatch({
            type: NavigationTypes.NAVIGATION_CLOSE_DRAWERS
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

export function goToMfa() {
    return async (dispatch, getState) => {
        dispatch({
            type: NavigationTypes.NAVIGATION_PUSH,
            route: Routes.Mfa
        }, getState);
    };
}

export function goToLoadTeam() {
    return async (dispatch, getState) => {
        dispatch({
            type: NavigationTypes.NAVIGATION_PUSH,
            route: Routes.LoadTeam
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

export function goToChannelInfo() {
    return async (dispatch, getState) => {
        dispatch({
            type: NavigationTypes.NAVIGATION_PUSH,
            route: Routes.ChannelInfo
        }, getState);
    };
}

export function goToChannelMembers() {
    return async (dispatch, getState) => {
        dispatch({
            type: NavigationTypes.NAVIGATION_PUSH,
            route: Routes.ChannelMembers
        }, getState);
    };
}

export function openChannelDrawer() {
    return async (dispatch, getState) => {
        dispatch({
            type: NavigationTypes.NAVIGATION_OPEN_LEFT_DRAWER,
            route: Routes.ChannelDrawer
        }, getState);
    };
}

export function openRightMenuDrawer() {
    return async (dispatch, getState) => {
        dispatch({
            type: NavigationTypes.NAVIGATION_OPEN_RIGHT_DRAWER,
            route: Routes.RightMenuDrawer
        }, getState);
    };
}
