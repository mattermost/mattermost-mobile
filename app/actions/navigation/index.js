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

export function goToChannelView() {
    return async (dispatch, getState) => {
        dispatch({
            type: NavigationTypes.NAVIGATION_PUSH,
            route: Routes.ChannelView
        }, getState);
    };
}

export function goToRecentMentions() {
    return async (dispatch, getState) => {
        dispatch({
            type: NavigationTypes.NAVIGATION_PUSH,
            route: {
                ...Routes.Search,
                props: {
                    searchType: 'recent_mentions'
                }
            }
        }, getState);
    };
}

export function goToFlaggedPosts() {
    return async (dispatch, getState) => {
        dispatch({
            type: NavigationTypes.NAVIGATION_PUSH,
            route: {
                ...Routes.Search,
                props: {
                    searchType: 'flagged_posts'
                }
            }
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
