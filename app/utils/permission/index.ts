// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {applicationName} from 'expo-application';
import {Alert, Platform} from 'react-native';
import Permissions, {type PermissionStatus} from 'react-native-permissions';

import type {IntlShape} from 'react-intl';

const getMicrophonePermission = () => Platform.select({
    ios: Permissions.PERMISSIONS.IOS.MICROPHONE,
    default: Permissions.PERMISSIONS.ANDROID.RECORD_AUDIO,
});

// Asks for the permission while the system can still prompt for it.
const resolveMicrophonePermission = async (status: PermissionStatus) => {
    switch (status) {
        case Permissions.RESULTS.DENIED:
        case Permissions.RESULTS.UNAVAILABLE: {
            const permissionRequest = await Permissions.request(getMicrophonePermission());
            return permissionRequest === Permissions.RESULTS.GRANTED;
        }
        case Permissions.RESULTS.BLOCKED:
            return false;
        default:
            return true;
    }
};

export const hasMicrophonePermission = async () => {
    const status = await Permissions.check(getMicrophonePermission());
    return resolveMicrophonePermission(status);
};

/**
 * Checks (and requests if needed) the microphone permission. When the permission
 * has been permanently blocked by the user, so the system can no longer prompt for it,
 * an alert pointing to the app settings is shown, mirroring the camera and photo library
 * permission flows.
 */
export const requestMicrophonePermission = async (intl: IntlShape) => {
    const status = await Permissions.check(getMicrophonePermission());
    if (status !== Permissions.RESULTS.BLOCKED) {
        return resolveMicrophonePermission(status);
    }

    Alert.alert(
        intl.formatMessage({
            id: 'mobile.microphone_permission_denied_title',
            defaultMessage: '{applicationName} would like to access your microphone',
        }, {applicationName}),
        intl.formatMessage({
            id: 'mobile.microphone_permission_denied_description',
            defaultMessage: 'Record voice notes and send them to your server. Open Settings to grant {applicationName} access to your microphone.',
        }, {applicationName}),
        [
            {
                text: intl.formatMessage({
                    id: 'mobile.permission_denied_retry',
                    defaultMessage: 'Settings',
                }),
                onPress: () => Permissions.openSettings(),
            },
            {
                text: intl.formatMessage({
                    id: 'mobile.permission_denied_dismiss',
                    defaultMessage: "Don't Allow",
                }),
            },
        ],
    );

    return false;
};
