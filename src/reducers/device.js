// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {handle, initialState} from './helpers.js';
import {DeviceTypes} from 'constants';
export const initState = initialState();

export default function device(state = initState, action) {
    return handle(
        DeviceTypes.DEVICE_REQUEST,
        DeviceTypes.DEVICE_SUCCESS,
        DeviceTypes.DEVICE_FAILURE,
        state,
        action
    );
}
