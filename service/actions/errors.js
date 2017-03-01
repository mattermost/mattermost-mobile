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

export function generalErrorObject(error, displayable = false) {
    return {
        type: ErrorTypes.LOG_ERROR,
        displayable,
        message: error.message
    };
}

export function generalError(error, displayable = false) {
    return async (dispatch) => {
        // do something with the incoming error
        // like sending it to analytics

        dispatch(generalErrorObject(error, displayable));
    };
}

export function clearErrors() {
    return async (dispatch) => {
        dispatch({type: ErrorTypes.CLEAR_ERRORS});
    };
}
