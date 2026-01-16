// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';

import {isTablet} from '@utils/helpers';

/**
 * Checks if the current platform is Android with edge-to-edge display (API 35+).
 * Android 35+ uses edge-to-edge layout where content extends behind system bars,
 * requiring different keyboard handling logic compared to older Android versions.
 */
export const isAndroidEdgeToEdge = Platform.OS === 'android' && Platform.Version >= 30;

export default {
    IS_TABLET: isTablet(),
    PUSH_NOTIFY_ANDROID_REACT_NATIVE: 'android_rn',
    PUSH_NOTIFY_APPLE_REACT_NATIVE: 'apple_rn',
};
