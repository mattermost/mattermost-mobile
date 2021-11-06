// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as FileSystem from 'expo-file-system';
import DeviceInfo from 'react-native-device-info';

export default {
    DOCUMENTS_PATH: `${FileSystem.cacheDirectory}/Documents`,
    IS_TABLET: DeviceInfo.isTablet(),
    PUSH_NOTIFY_ANDROID_REACT_NATIVE: 'android_rn',
    PUSH_NOTIFY_APPLE_REACT_NATIVE: 'apple_rn',
};
