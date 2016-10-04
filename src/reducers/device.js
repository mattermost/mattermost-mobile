// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.
import * as types from '../actions/device';
import {initialState, handle} from './helpers';

export default function device(state = initialState(), action) {
    return handle(types.DEVICE_REQUEST, types.DEVICE_SUCCESS, types.DEVICE_FAILURE, state, action);
}