// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {RequestStatus} from 'constants';

export function initialRequestState() {
    return {
        status: RequestStatus.NOT_STARTED,
        error: null
    };
}

export function handleRequest(REQUEST, SUCCESS, FAILURE, state, action) {
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
