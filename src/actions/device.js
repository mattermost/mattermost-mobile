// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {requestData, requestSuccess, requestFailure} from './helpers.js';
import {AsyncStorage} from 'react-native';

export const DEVICE_REQUEST = 'DEVICE_REQUEST';
export const DEVICE_SUCCESS = 'DEVICE_SUCCESS';
export const DEVICE_FAILURE = 'DEVICE_FAILURE';

function fetchDevice() {
    return async (dispatch) => {
        try {
            dispatch(requestData(DEVICE_REQUEST));
            const json = await AsyncStorage.getItem('basic_info');
            dispatch(requestSuccess(DEVICE_SUCCESS, JSON.parse(json)));
        } catch (err) {
            dispatch(requestFailure(DEVICE_FAILURE, {msg: 'failed to load local storage'}));
        }
    };
}

export function loadDevice() {
    return (dispatch, getState) => { // eslint-disable-line no-unused-vars
        return dispatch(fetchDevice());
    };
}
