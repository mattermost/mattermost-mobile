// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as FileSystem from 'expo-file-system';
import {Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';

const isPhoneWithInsets = Platform.OS === 'ios' && DeviceInfo.hasNotch();
const isIPhone12Mini = DeviceInfo.getModel() === 'iPhone 12 mini';
const isTablet = DeviceInfo.isTablet();

export default {
    DOCUMENTS_PATH: `${FileSystem.cacheDirectory}/Documents`,
    IS_TABLET: isTablet,
    PUSH_NOTIFY_ANDROID_REACT_NATIVE: 'android_rn',
    PUSH_NOTIFY_APPLE_REACT_NATIVE: 'apple_rn',
    AUTOCOMPLETE_MAX_HEIGHT: (isPhoneWithInsets && !isIPhone12Mini) || isTablet ? 200 : 145,
    IS_IPHONE_WITH_INSETS: isPhoneWithInsets,
};
