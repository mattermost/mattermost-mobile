// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {NavigationTypes} from 'app/constants';
import Routes from 'app/navigation/routes';

export function goToChannelView() {
    return async (dispatch, getState) => {
        dispatch({
            type: NavigationTypes.NAVIGATION_RESET,
            routes: [Routes.ChannelView]
        }, getState);
    };
}
