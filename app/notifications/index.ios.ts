// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-unused-vars */

import {Notifications} from 'react-native-notifications';

export default {
    getDeliveredNotifications: Notifications.ios.getDeliveredNotifications,
    getPreferences: async () => null,
    play: (soundUri: string) => {},
    removeDeliveredNotifications: Notifications.ios.removeDeliveredNotifications,
    setNotificationSound: () => {},
    setShouldBlink: (shouldBlink: boolean) => {},
    setShouldVibrate: (shouldVibrate: boolean) => {},
} as NativeNotification;
