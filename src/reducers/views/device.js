// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {DeviceTypes} from 'constants';
import RequestStatus from 'constants/request_status';

export const initState = {
    status: RequestStatus.NOT_STARTED,
    error: null
};

export default function device(state = initState, action) {
    switch (action.type) {
    case DeviceTypes.DEVICE_REQUEST:
        return {
            ...state,
            status: RequestStatus.STARTED
        };
    case DeviceTypes.DEVICE_SUCCESS:
        return {
            ...state,
            status: RequestStatus.SUCCESS,
            data: action.data,
            error: null
        };
    case DeviceTypes.DEVICE_FAILURE:
        return {
            ...state,
            status: RequestStatus.FAILURE,
            error: action.error
        };

    default:
        return state;
    }
}
