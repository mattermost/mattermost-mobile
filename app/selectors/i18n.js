// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import DeviceInfo from 'react-native-device-info';
import {createSelector} from 'reselect';

import DEFAULT_LOCALE from 'app/i18n';

import {getCurrentUser} from 'mattermost-redux/selectors/entities/users';

export const getCurrentUserLocale = createSelector(
    getCurrentUser,
    (currentUser) => {
        return currentUser ? currentUser.locale : '';
    }
);

// Not a proper selector since the device locale isn't in the redux store
export function getCurrentLocale(state) {
    const userLocale = getCurrentUserLocale(state);
    if (userLocale) {
        return userLocale;
    }

    const deviceLocale = DeviceInfo.getDeviceLocale().split('-')[0];
    if (deviceLocale) {
        return deviceLocale;
    }

    return DEFAULT_LOCALE;
}
