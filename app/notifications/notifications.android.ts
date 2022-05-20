// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {NativeModules, PermissionsAndroid} from 'react-native';

const {NotificationPreferences} = NativeModules;

const defaultPreferences: NativeNotificationPreferences = {
    sounds: [],
    shouldBlink: false,
    shouldVibrate: true,
};

const nativeNotification: NativeNotification = {
    getDeliveredNotifications: NotificationPreferences.getDeliveredNotifications,
    getPreferences: async () => {
        try {
            const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
            let granted;
            if (!hasPermission) {
                granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
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
    play: NotificationPreferences.previewSound,
    removeDeliveredNotifications: NotificationPreferences.removeDeliveredNotifications,
    setNotificationSound: NotificationPreferences.setNotificationSound,
    setShouldBlink: NotificationPreferences.setShouldBlink,
    setShouldVibrate: NotificationPreferences.setShouldVibrate,
};

export default nativeNotification;
