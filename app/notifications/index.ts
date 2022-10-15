// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {NativeModules} from 'react-native';

const {Notifications} = NativeModules;

const nativeNotification: NativeNotification = {
    getDeliveredNotifications: Notifications.getDeliveredNotifications,
    removeChannelNotifications: Notifications.removeChannelNotifications,
    removeThreadNotifications: Notifications.removeThreadNotifications,
    removeServerNotifications: Notifications.removeServerNotifications,
};

export default nativeNotification;
