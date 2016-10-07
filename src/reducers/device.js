// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {handle, initialState} from './helpers.js';
import * as Types from 'actions/device.js';

export default function device(state = initialState(), action) {
    return handle(Types.DEVICE_REQUEST, Types.DEVICE_SUCCESS, Types.DEVICE_FAILURE, state, action);
}