// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {IntlShape} from 'react-intl';
import DeviceInfo from 'react-native-device-info';

export const getPermissionMessages = (intl: IntlShape) => {
    const {formatMessage} = intl;
    const applicationName = DeviceInfo.getApplicationName();

    return {
        camera: {
            title: formatMessage({
                id: 'mobile.camera_photo_permission_denied_title',
                defaultMessage: '{applicationName} would like to access your camera',
            }, {applicationName}),
            text: formatMessage({
                id: 'mobile.camera_photo_permission_denied_description',
                defaultMessage: 'Take photos and upload them to your Mattermost instance or save them to your device. Open Settings to grant Mattermost Read and Write access to your camera.',
            }),
        },
        storage: {
            title: formatMessage({
                id: 'mobile.storage_permission_denied_title',
                defaultMessage: '{applicationName} would like to access your files',
            }, {applicationName}),
            text: formatMessage({
                id: 'mobile.storage_permission_denied_description',
                defaultMessage: 'Upload files to your Mattermost instance. Open Settings to grant Mattermost Read and Write access to files on this device.',
            }),
        },
        denied: {
            ios: {
                title: formatMessage({
                    id: 'mobile.ios.photos_permission_denied_title',
                    defaultMessage: '{applicationName} would like to access your photos',
                }, {applicationName}),
                text: formatMessage({
                    id: 'mobile.ios.photos_permission_denied_description',
                    defaultMessage: 'Upload photos and videos to your Mattermost instance or save them to your device. Open Settings to grant Mattermost Read and Write access to your photo and video library.',
                }),
            },
            android: {
                title: formatMessage({
                    id: 'mobile.android.photos_permission_denied_title',
                    defaultMessage: '{applicationName} would like to access your photos'}, {applicationName}),
                text: formatMessage({
                    id: 'mobile.android.photos_permission_denied_description',
                    defaultMessage: 'Upload photos to your Mattermost instance or save them to your device. Open Settings to grant Mattermost Read and Write access to your photo library.',
                }),
            },
        },
    };
};
