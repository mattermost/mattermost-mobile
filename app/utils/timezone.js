// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DeviceInfo from 'react-native-device-info';

import {isMinimumServerVersion} from 'mattermost-redux/utils/helpers';

export function getDeviceTimezone() {
    return DeviceInfo.getTimezone();
}

export function getDeviceUtcOffset() {
    const reverseOffsetInMinutes = new Date().getTimezoneOffset();
    return -reverseOffsetInMinutes;
}

export function isTimezoneEnabled(state) {
    const {config} = state.entities.general;
    const serverVersion = state.entities.general.serverVersion;
    return config.ExperimentalTimezone === 'true' && isMinimumServerVersion(serverVersion, 4, 9);
}
