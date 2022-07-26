// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert, Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import Permissions from 'react-native-permissions';

import type {IntlShape} from 'react-intl';

const getMicrophonePermissionDeniedMessage = (intl: IntlShape) => {
    const {formatMessage} = intl;
    const applicationName = DeviceInfo.getApplicationName();
    return {
        title: formatMessage({
            id: 'mobile.microphone_permission_denied_title',
            defaultMessage: '{applicationName} would like to access your microphone',
        }, {applicationName}),
        text: formatMessage({
            id: 'mobile.microphone_permission_denied_description',
            defaultMessage: 'To participate in this call, open Settings to grant Mattermost access to your microphone.',
        }),
    };
};

export const hasMicrophonePermission = async (intl: IntlShape) => {
    const targetSource = Platform.OS === 'ios' ? Permissions.PERMISSIONS.IOS.MICROPHONE : Permissions.PERMISSIONS.ANDROID.RECORD_AUDIO;
    const hasPermission = await Permissions.check(targetSource);

    switch (hasPermission) {
        case Permissions.RESULTS.DENIED:
        case Permissions.RESULTS.UNAVAILABLE: {
            const permissionRequest = await Permissions.request(targetSource);

            return permissionRequest === Permissions.RESULTS.GRANTED;
        }
        case Permissions.RESULTS.BLOCKED: {
            const grantOption = {
                text: intl.formatMessage({
                    id: 'mobile.permission_denied_retry',
                    defaultMessage: 'Settings',
                }),
                onPress: () => Permissions.openSettings(),
            };

            const {title, text} = getMicrophonePermissionDeniedMessage(intl);

            Alert.alert(
                title,
                text,
                [
                    grantOption,
                    {
                        text: intl.formatMessage({
                            id: 'mobile.permission_denied_dismiss',
                            defaultMessage: 'Don\'t Allow',
                        }),
                    },
                ],
            );
            return false;
        }
    }

    return true;
};

