// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

export function requestData(type) {
    return {
        type
    };
}

export function requestSuccess(type, data) {
    return {
        type,
        data
    };
}

export function requestFailure(type, error) {
    return {
        type,
        error
    };
}

export function emptyError() {
    return {
        id: '',
        message: '',
        detailed_error: '',
        status_code: ''
    };
}

export function bindClientFunc(clientFunc, request, success, failure) {
    return (dispatch, getState) => {
        function onRequest() {
            dispatch(requestData(request));
        }

        function onSuccess(json) {
            dispatch(requestSuccess(success, json));
        }

        function onFailure(err) {
            dispatch(requestFailure(failure, err));
        }

        return dispatch(clientFunc(onRequest, onSuccess, onFailure), getState);
    };
}