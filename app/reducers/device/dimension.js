// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Dimensions} from 'react-native';

import {DeviceTypes} from '@constants';

const {height, width} = Dimensions.get('window');
const initialState = {
    deviceHeight: height,
    deviceWidth: width,
};

export default function dimension(state = initialState, action) {
    switch (action.type) {
    case DeviceTypes.DEVICE_DIMENSIONS_CHANGED: {
        const {data} = action;
        if (state.deviceWidth !== data.deviceWidth || state.deviceHeight !== data.deviceHeight) {
            return {...data};
        }
        break;
    }
    }

    return state;
}

