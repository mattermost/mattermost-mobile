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

export function bindClientFunc(clientFunc, request, success, failure, ...args) {
    return (dispatch, getState) => {
        function onRequest() {
            return dispatch(() => requestData(request), getState);
        }

        function onSuccess(data) {
            return dispatch(() => requestSuccess(success, data), getState);
        }

        function onFailure(err) {
            return dispatch(() => requestFailure(failure, err), getState);
        }

        return dispatch(() => clientFunc(onRequest, onSuccess, onFailure, ...args), getState);
    };
}