// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';
import Permissions from 'react-native-permissions';

export const hasBluetoothPermission = async () => {
    const bluetooth = Platform.select({
        ios: Permissions.PERMISSIONS.IOS.BLUETOOTH,
        default: Permissions.PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
    });

    const hasBluetooth = await Permissions.check(bluetooth);

    switch (hasBluetooth) {
        case Permissions.RESULTS.DENIED:
        case Permissions.RESULTS.UNAVAILABLE: {
            const permissionRequest = await Permissions.request(bluetooth);
            return permissionRequest === Permissions.RESULTS.GRANTED;
        }
        case Permissions.RESULTS.BLOCKED:
            return false;
        default:
            return true;
    }
};

export const hasMicrophonePermission = async () => {
    const microphone = Platform.select({
        ios: Permissions.PERMISSIONS.IOS.MICROPHONE,
        default: Permissions.PERMISSIONS.ANDROID.RECORD_AUDIO,
    });

    const hasMicrophone = await Permissions.check(microphone);

    switch (hasMicrophone) {
        case Permissions.RESULTS.DENIED:
        case Permissions.RESULTS.UNAVAILABLE: {
            const permissionRequest = await Permissions.request(microphone);
            return permissionRequest === Permissions.RESULTS.GRANTED;
        }
        case Permissions.RESULTS.BLOCKED:
            return false;
        default:
            return true;
    }
};

