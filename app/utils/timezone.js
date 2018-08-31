// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DeviceInfo from 'react-native-device-info';

import {isMinimumServerVersion} from 'mattermost-redux/utils/helpers';

import moment from 'moment-timezone';

export function getDeviceTimezone() {
    return DeviceInfo.getTimezone();
}

export function getDeviceUtcOffset() {
    return moment().utcOffset();
}

export function getUtcOffsetForTimeZone(timezone) {
    return moment.tz(timezone).utcOffset();
}

export function isTimezoneEnabled(state) {
    const {config} = state.entities.general;
    const serverVersion = state.entities.general.serverVersion;
    return config.ExperimentalTimezone === 'true' && isMinimumServerVersion(serverVersion, 4, 9);
}
