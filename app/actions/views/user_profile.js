// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {makeDirectChannel} from 'app/actions/views/more_dms';
import {NavigationTypes} from 'app/constants';

export function handleSendMessage(otherUserId) {
    return async (dispatch, getState) => {
        await makeDirectChannel(otherUserId)(dispatch, getState);
        dispatch({type: NavigationTypes.NAVIGATION_POP_TO_INDEX, index: 0}, getState);
    };
}
