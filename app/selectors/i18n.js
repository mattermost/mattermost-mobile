// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import DeviceInfo from 'react-native-device-info';

import {DEFAULT_LOCALE} from 'mattermost-redux/constants/general';
import {getCurrentUserLocale} from 'mattermost-redux/selectors/entities/i18n';

// Not a proper selector since the device locale isn't in the redux store
export function getCurrentLocale(state) {
    const deviceLocale = DeviceInfo.getDeviceLocale().split('-')[0];
    const defaultLocale = deviceLocale || DEFAULT_LOCALE;

    return getCurrentUserLocale(state, defaultLocale);
}
