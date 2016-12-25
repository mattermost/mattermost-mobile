// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {ViewTypes} from 'app/constants';

export function openChannelSidebar() {
    return async (dispatch, getState) => {
        dispatch({type: ViewTypes.TOGGLE_CHANNEL_SIDEBAR, data: true}, getState);
    };
}

export function closeChannelSidebar() {
    return async (dispatch, getState) => {
        dispatch({type: ViewTypes.TOGGLE_CHANNEL_SIDEBAR, data: false}, getState);
    };
}
