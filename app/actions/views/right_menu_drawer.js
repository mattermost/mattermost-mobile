// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {batchActions} from 'redux-batched-actions';

import {NavigationTypes} from 'app/constants';
import Routes from 'app/navigation/routes';

export function goToSelectTeam() {
    return async (dispatch, getState) => {
        dispatch(batchActions([{
            type: NavigationTypes.NAVIGATION_CLOSE_DRAWERS
        }, {
            type: NavigationTypes.NAVIGATION_PUSH,
            route: Routes.SelectTeam
        }]), getState);
    };
}

export function goToRecentMentions() {
    return async (dispatch, getState) => {
        dispatch(batchActions([{
            type: NavigationTypes.NAVIGATION_CLOSE_DRAWERS
        }, {
            type: NavigationTypes.NAVIGATION_PUSH,
            route: {
                ...Routes.Search,
                props: {
                    searchType: 'recent_mentions'
                }
            }
        }]), getState);
    };
}

export function goToFlaggedPosts() {
    return async (dispatch, getState) => {
        dispatch(batchActions([{
            type: NavigationTypes.NAVIGATION_CLOSE_DRAWERS
        }, {
            type: NavigationTypes.NAVIGATION_PUSH,
            route: {
                ...Routes.Search,
                props: {
                    searchType: 'flagged_posts'
                }
            }
        }]), getState);
    };
}
