// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {NavigationTypes} from 'app/constants';
import Routes from 'app/navigation/routes';

export function goToSelectTeam() {
    return async (dispatch, getState) => {
        dispatch({
            type: NavigationTypes.NAVIGATION_REPLACE,
            route: Routes.SelectTeam
        }, getState);
    };
}

export function goToRecentMentions() {
    return async (dispatch, getState) => {
        dispatch({
            type: NavigationTypes.NAVIGATION_REPLACE,
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
            type: NavigationTypes.NAVIGATION_REPLACE,
            route: {
                ...Routes.Search,
                props: {
                    searchType: 'flagged_posts'
                }
            }
        }, getState);
    };
}
