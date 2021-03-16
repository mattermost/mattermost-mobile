// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Notifications} from 'react-native-notifications';

/* eslint-disable */
export default {
    getDeliveredNotifications: Notifications.ios.getDeliveredNotifications,
    getPreferences: async () => null,
    play: (soundUri: string) => {},
    removeDeliveredNotifications: Notifications.ios.removeDeliveredNotifications,
    setNotificationSound: () => {},
    setShouldBlink: (shouldBlink: boolean) => {},
    setShouldVibrate: (shouldVibrate: boolean) => {},
} as NativeNotification;
