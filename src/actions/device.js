// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {requestData, requestSuccess, requestFailure} from './helpers';
import {AsyncStorage} from 'react-native';

export const DEVICE_REQUEST = 'DEVICE_REQUEST';
export const DEVICE_SUCCESS = 'DEVICE_SUCCESS';
export const DEVICE_FAILURE = 'DEVICE_FAILURE';

function fetchDevice() {
    return (dispatch) => {
        dispatch(requestData(DEVICE_REQUEST));

        AsyncStorage.getItem('basic_info', (err, data) => {
            if (err) {
                dispatch(requestFailure(DEVICE_FAILURE, {msg: 'failed to load local storage'}));
            }

            if (data && data.length > 0) {
                const json = JSON.parse(data);
                dispatch(requestSuccess(DEVICE_SUCCESS, json));
            } else {
                dispatch(requestSuccess(DEVICE_SUCCESS, {hello: 'hello'}));
            }
        });
    };
}

export function loadDevice() {
    return (dispatch, getState) => { // eslint-disable-line no-unused-vars
        return dispatch(fetchDevice());
    };
}