// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {NativeModules} from 'react-native';

const {NotificationPreferences} = NativeModules;

export default {
    getPreferences: NotificationPreferences.getPreferences,
    setNotificationSound: NotificationPreferences.setNotificationSound,
    setShouldVibrate: NotificationPreferences.setShouldVibrate,
    setShouldBlink: NotificationPreferences.setShouldBlink,
    play: NotificationPreferences.previewSound
};
