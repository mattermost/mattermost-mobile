// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {networkStatusChangedAction} from 'redux-offline';
import {batchActions} from 'redux-batched-actions';

import {DeviceTypes} from 'app/constants';

export function connection(isOnline) {
    return async (dispatch) => {
        if (isOnline !== undefined) { //eslint-disable-line no-undefined
            dispatch(batchActions([
                networkStatusChangedAction(isOnline), {
                    type: DeviceTypes.CONNECTION_CHANGED,
                    data: isOnline,
                },
            ], 'BATCH_CONNECTION_CHANGED'));
        }
    };
}

export function setStatusBarHeight(height = 20) {
    return {
        type: DeviceTypes.STATUSBAR_HEIGHT_CHANGED,
        data: height,
    };
}

export function setDeviceDimensions(height, width) {
    return {
        type: DeviceTypes.DEVICE_DIMENSIONS_CHANGED,
        data: {
            deviceHeight: height,
            deviceWidth: width,
        },
    };
}

export function setDeviceOrientation(orientation) {
    return {
        type: DeviceTypes.DEVICE_ORIENTATION_CHANGED,
        data: orientation,
    };
}

export function setDeviceAsTablet() {
    return {
        type: DeviceTypes.DEVICE_TYPE_CHANGED,
        data: true,
    };
}

export default {
    connection,
    setDeviceDimensions,
    setDeviceOrientation,
    setDeviceAsTablet,
    setStatusBarHeight,
};
