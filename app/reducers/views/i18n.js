// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineReducers} from 'redux';
import DeviceInfo from 'react-native-device-info';

import {UserTypes} from '@mm-redux/action_types';

const defaultLocale = DeviceInfo.getDeviceLocale().split('-')[0];

function locale(state = defaultLocale, action) {
    switch (action.type) {
    case UserTypes.RECEIVED_ME: {
        const data = action.data || action.payload;
        if (data?.locale) {
            return data.locale;
        }
    }
    }

    return state;
}

export default combineReducers({
    locale,
});
