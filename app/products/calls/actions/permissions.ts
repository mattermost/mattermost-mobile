// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';
import Permissions from 'react-native-permissions';

export const hasMicrophonePermission = async () => {
    const targetSource = Platform.select({
        ios: Permissions.PERMISSIONS.IOS.MICROPHONE,
        default: Permissions.PERMISSIONS.ANDROID.RECORD_AUDIO,
    });
    const hasPermission = await Permissions.check(targetSource);

    switch (hasPermission) {
        case Permissions.RESULTS.DENIED:
        case Permissions.RESULTS.UNAVAILABLE: {
            const permissionRequest = await Permissions.request(targetSource);

            return permissionRequest === Permissions.RESULTS.GRANTED;
        }
        case Permissions.RESULTS.BLOCKED:
            return false;
    }

    return true;
};

