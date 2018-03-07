// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {Dimensions} from 'react-native';

import {UserTypes} from 'mattermost-redux/action_types';
import {DeviceTypes} from 'app/constants';

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
    case UserTypes.LOGOUT_SUCCESS:
        return initialState;
    }

    return state;
}

