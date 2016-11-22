// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import RequestStatus from 'constants/request_status';

export function initialState() {
    return {
        status: RequestStatus.NOT_STARTED,
        data: {},
        error: null
    };
}

export function handle(REQUEST, SUCCESS, FAILURE, state, action) {
    switch (action.type) {
    case REQUEST:
        return {
            ...state,
            status: RequestStatus.STARTED
        };
    case SUCCESS:
        return {
            ...state,
            status: RequestStatus.SUCCESS,
            data: action.data,
            error: null
        };
    case FAILURE:
        return {
            ...state,
            status: RequestStatus.FAILURE,
            error: action.error
        };

    default:
        return state;
    }
}
