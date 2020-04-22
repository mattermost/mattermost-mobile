// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DeviceInfo from 'react-native-device-info';

import {UserTypes} from '@mm-redux/action_types';

export default function previousVersion(state = '', action) {
    switch (action.type) {
    case UserTypes.LOGIN:
        return state || DeviceInfo.getVersion();
    }
    return state;
}
