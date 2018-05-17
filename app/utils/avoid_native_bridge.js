// Copyright (c) 2018-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {Platform} from 'react-native';

/**
 * avoidNativeBridge: a helper function that facilitates returning
 * a constant variable packaged from InitializationModule
 * or from a NativeModule which will make a call to the native bridge
 *
 * Currently only required for Android
 */
export default function avoidNativeBridge(runOptimized, optimized, fallback) {
    if (Platform.OS === 'android' && runOptimized()) {
        return optimized();
    }

    return fallback();
}
