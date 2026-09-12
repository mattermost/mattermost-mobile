// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {applicationName} from 'expo-application';
import {defineMessages, type IntlShape} from 'react-intl';
import {Alert, Linking, Platform} from 'react-native';
import Permissions from 'react-native-permissions';

const messages = defineMessages({
    cameraPermissionDeniedTitle: {
        id: 'mobile.calls_camera_permission_denied_title',
        defaultMessage: '{applicationName} would like to access your camera',
    },
    cameraPermissionDeniedDescription: {
        id: 'mobile.calls_camera_permission_denied_description',
        defaultMessage: 'Share video on calls. Open Settings to grant {applicationName} access to your camera.',
    },
});

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

// Requests the camera permission before the first startVideo. On permanent
// denial (BLOCKED), routes the user to system settings via an alert rather
// than failing silently -- mirrors hasWriteStoragePermission in
// @utils/file/index.ts.
export const hasCameraPermission = async (intl: IntlShape) => {
    const camera = Platform.select({
        ios: Permissions.PERMISSIONS.IOS.CAMERA,
        default: Permissions.PERMISSIONS.ANDROID.CAMERA,
    });

    const cameraPermission = await Permissions.check(camera);

    switch (cameraPermission) {
        case Permissions.RESULTS.DENIED:
        case Permissions.RESULTS.UNAVAILABLE: {
            const permissionRequest = await Permissions.request(camera);
            return permissionRequest === Permissions.RESULTS.GRANTED;
        }
        case Permissions.RESULTS.BLOCKED: {
            const appName = applicationName ?? 'Mattermost';
            Alert.alert(
                intl.formatMessage(messages.cameraPermissionDeniedTitle, {applicationName: appName}),
                intl.formatMessage(messages.cameraPermissionDeniedDescription, {applicationName: appName}),
                [
                    {
                        text: intl.formatMessage({
                            id: 'mobile.permission_denied_dismiss',
                            defaultMessage: "Don't Allow",
                        }),
                    },
                    {
                        text: intl.formatMessage({
                            id: 'mobile.permission_denied_retry',
                            defaultMessage: 'Settings',
                        }),
                        onPress: () => Linking.openSettings(),
                    },
                ],
            );
            return false;
        }
        default:
            return true;
    }
};
