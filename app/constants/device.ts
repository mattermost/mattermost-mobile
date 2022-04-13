// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DeviceInfo from 'react-native-device-info';
import FileSystem from 'react-native-fs';

export default {
    DOCUMENTS_PATH: `${FileSystem.CachesDirectoryPath}/Documents`,
    IS_TABLET: DeviceInfo.isTablet(),
    PUSH_NOTIFY_ANDROID_REACT_NATIVE: 'android_rn',
    PUSH_NOTIFY_APPLE_REACT_NATIVE: 'apple_rn',
};
