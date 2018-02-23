// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {NativeModules, PermissionsAndroid} from 'react-native';

const {NotificationPreferences} = NativeModules;

const defaultPreferences = {
    sounds: [],
    shouldBlink: false,
    shouldVibrate: true,
};

export default {
    getPreferences: async () => {
        try {
            const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
            let granted;
            if (!hasPermission) {
                granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
                );
            }

            if (hasPermission || granted === PermissionsAndroid.RESULTS.GRANTED) {
                return await NotificationPreferences.getPreferences();
            }

            return defaultPreferences;
        } catch (error) {
            return defaultPreferences;
        }
    },
    setNotificationSound: NotificationPreferences.setNotificationSound,
    setShouldVibrate: NotificationPreferences.setShouldVibrate,
    setShouldBlink: NotificationPreferences.setShouldBlink,
    play: NotificationPreferences.previewSound,
};
