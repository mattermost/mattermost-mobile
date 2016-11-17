// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import RequestStatus from 'constants/request_status';

export function initialState() {
    return {
        status: RequestStatus.UNSENT,
        data: {},
        error: null
    };
}

export function handle(REQUEST, SUCCESS, FAILURE, state, action) {
    switch (action.type) {
    case REQUEST:
        return {
            status: RequestStatus.IN_PROGRESS,
            ...state
        };
    case SUCCESS:
        return {
            status: RequestStatus.SUCCEEDED,
            data: action.data,
            error: null
        };
    case FAILURE:
        return {
            status: RequestStatus.FAILED,
            ...state,
            error: action.error
        };

    default:
        return state;
    }
}
