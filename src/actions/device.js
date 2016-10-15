// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {requestData, requestSuccess, requestFailure} from './helpers.js';
import {AsyncStorage} from 'react-native';
import {DeviceTypes as types} from 'constants';

function fetchDevice() {
    return async (dispatch) => {
        try {
            dispatch(requestData(types.DEVICE_REQUEST));
            const json = await AsyncStorage.getItem('basic_info');
            dispatch(requestSuccess(types.DEVICE_SUCCESS, JSON.parse(json)));
        } catch (err) {
            dispatch(requestFailure(types.DEVICE_FAILURE, {msg: 'failed to load local storage'}));
        }
    };
}

export function loadDevice() {
    return (dispatch, getState) => { // eslint-disable-line no-unused-vars
        return dispatch(fetchDevice());
    };
}
