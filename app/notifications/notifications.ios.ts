// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Notifications} from 'react-native-notifications';

import {emptyFunction} from '@utils/general';

const nativeNotification: NativeNotification = {
    getDeliveredNotifications: async () => Notifications.ios.getDeliveredNotifications(),
    getPreferences: async () => null,
    play: (soundUri: string) => emptyFunction(soundUri),
    removeDeliveredNotifications: async (ids: string[]) => Notifications.ios.removeDeliveredNotifications(ids),
    setNotificationSound: () => emptyFunction(),
    setShouldBlink: (shouldBlink: boolean) => emptyFunction(shouldBlink),
    setShouldVibrate: (shouldVibrate: boolean) => emptyFunction(shouldVibrate),
};

export default nativeNotification;
