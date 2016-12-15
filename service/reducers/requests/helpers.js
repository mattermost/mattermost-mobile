// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {RequestStatus} from 'service/constants';

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
            error: null
        };
    case FAILURE: {
        let error = action.error;
        if (error instanceof Error) {
            error = error.toString();
        }

        return {
            ...state,
            status: RequestStatus.FAILURE,
            error
        };
    }
    default:
        return state;
    }
}
