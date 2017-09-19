// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {Dimensions} from 'react-native';

import {DeviceTypes} from 'app/constants';

export function calculateDeviceDimensions() {
    const {height, width} = Dimensions.get('window');
    return {
        type: DeviceTypes.DEVICE_DIMENSIONS_CHANGED,
        data: {
            deviceHeight: height,
            deviceWidth: width
        }
    };
}

export function connection(isOnline) {
    return async (dispatch, getState) => {
        dispatch({
            type: DeviceTypes.CONNECTION_CHANGED,
            data: isOnline
        }, getState);
    };
}

export function setStatusBarHeight(height = 20) {
    return {
        type: DeviceTypes.STATUSBAR_HEIGHT_CHANGED,
        data: height
    };
}

export default {
    calculateDeviceDimensions,
    connection,
    setStatusBarHeight
};
