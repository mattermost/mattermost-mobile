// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {ErrorTypes} from 'service/constants';

export function dismissErrorObject(index) {
    return {
        type: ErrorTypes.DISMISS_ERROR,
        index
    };
}

export function dismissError(index) {
    return async (dispatch) => {
        dispatch(dismissErrorObject(index));
    };
}

export function generalErrorObject(error) {
    return {
        type: ErrorTypes.GENERAL_ERROR,
        errorType: 'general',
        message: error.message
    };
}

export function generalError(error) {
    return async (dispatch) => {
        // do something with the incoming error
        // like sending it to analytics

        dispatch(generalErrorObject(error));
    };
}
