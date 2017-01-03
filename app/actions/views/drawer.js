// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {ViewTypes} from 'app/constants';

export function openChannelDrawer() {
    return async (dispatch, getState) => {
        dispatch({type: ViewTypes.TOGGLE_CHANNEL_DRAWER, data: true}, getState);
    };
}

export function closeChannelDrawer() {
    return async (dispatch, getState) => {
        dispatch({type: ViewTypes.TOGGLE_CHANNEL_DRAWER, data: false}, getState);
    };
}
