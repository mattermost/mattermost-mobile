// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import Client from 'service/client';
import {UsersTypes} from 'service/constants';
const HTTP_UNAUTHORIZED = 401;

export async function forceLogoutIfNecessary(err, dispatch) {
    if (err.status_code === HTTP_UNAUTHORIZED && err.url.indexOf('/login') === -1) {
        await Client.logout();
        dispatch({type: UsersTypes.LOGOUT_SUCCESS});
    }
}

function dispatcher(type, data, dispatch, getState) {
    if (type.indexOf('SUCCESS') === -1) { // we don't want to pass the data for the request types
        dispatch(requestSuccess(type, data), getState);
    } else {
        dispatch(requestData(type), getState);
    }
}

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

export function bindClientFunc(clientFunc, request, success, failure, ...args) {
    return async (dispatch, getState) => {
        dispatch(requestData(request), getState);

        try {
            const data = await clientFunc(...args);
            if (Array.isArray(success)) {
                success.forEach((s) => {
                    dispatcher(s, data, dispatch, getState);
                });
            } else {
                dispatcher(success, data, dispatch, getState);
            }
        } catch (err) {
            forceLogoutIfNecessary(err, dispatch);
            dispatch(requestFailure(failure, err), getState);
        }
    };
}
