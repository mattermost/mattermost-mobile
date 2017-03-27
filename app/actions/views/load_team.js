// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {NavigationTypes} from 'app/constants';
import Routes from 'app/navigation/routes';

export function goToChannelView() {
    return async (dispatch, getState) => {
        const state = getState();
        if (state.views.login.loginId) {
            dispatch({
                type: NavigationTypes.NAVIGATION_REPLACE_AT_ROOT,
                route: Routes.ChannelView
            }, getState);

            dispatch({
                type: NavigationTypes.NAVIGATION_CLOSE_MODAL
            }, getState);
        } else {
            dispatch({
                type: NavigationTypes.NAVIGATION_RESET,
                routes: [Routes.ChannelView]
            }, getState);
        }
    };
}
