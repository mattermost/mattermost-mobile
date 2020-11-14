// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {FileSystem} from 'react-native-unimodules';
import DeviceInfo from 'react-native-device-info';
import keyMirror from '@utils/key_mirror';

const device = keyMirror({
    CONNECTION_CHANGED: null,
    DEVICE_DIMENSIONS_CHANGED: null,
    DEVICE_TYPE_CHANGED: null,
    DEVICE_ORIENTATION_CHANGED: null,
    STATUSBAR_HEIGHT_CHANGED: null,
});

export default {
    ...device,
    DOCUMENTS_PATH: `${FileSystem.cacheDirectory}/Documents`,
    IMAGES_PATH: `${FileSystem.cacheDirectory}/Images`,
    IS_TABLET: DeviceInfo.isTablet(),
    VIDEOS_PATH: `${FileSystem.cacheDirectory}/Videos`,
    PERMANENT_SIDEBAR_SETTINGS: '@PERMANENT_SIDEBAR_SETTINGS',
    TABLET_WIDTH: 250,
    PUSH_NOTIFY_APPLE_REACT_NATIVE: 'apple_rn',
    PUSH_NOTIFY_ANDROID_REACT_NATIVE: 'android_rn',
};
