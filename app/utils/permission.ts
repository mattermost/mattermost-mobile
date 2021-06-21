// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {intlShape} from 'react-intl';
import {Alert, Platform} from 'react-native';
import AndroidOpenSettings from 'react-native-android-open-settings';
import DeviceInfo from 'react-native-device-info';
import Permissions from 'react-native-permissions';

const getCameraPermissionDeniedMessage = (intl: typeof intlShape) => {
    const {formatMessage} = intl;
    const applicationName = DeviceInfo.getApplicationName();
    return {
        title: formatMessage({
            id: 'mobile.camera_photo_permission_denied_title',
            defaultMessage: '{applicationName} would like to access your camera',
        }, {applicationName}),
        text: formatMessage({
            id: 'mobile.camera_photo_permission_denied_description',
            defaultMessage: 'Take photos and upload them to your Mattermost instance or save them to your device. Open Settings to grant Mattermost Read and Write access to your camera.',
        }),
    };
};

const getPhotoPermissionDeniedMessage = (intl: typeof intlShape) => {
    const {formatMessage} = intl;
    const applicationName = DeviceInfo.getApplicationName();
    if (Platform.OS === 'android') {
        return {
            title: formatMessage({
                id: 'mobile.android.photos_permission_denied_title',
                defaultMessage: '{applicationName} would like to access your photos',
            }, {applicationName}),
            text: formatMessage({
                id: 'mobile.android.photos_permission_denied_description',
                defaultMessage: 'Upload photos to your Mattermost instance or save them to your device. Open Settings to grant Mattermost Read and Write access to your photo library.',
            }),
        };
    }

    return {
        title: formatMessage({
            id: 'mobile.ios.photos_permission_denied_title',
            defaultMessage: '{applicationName} would like to access your photos',
        }, {applicationName}),
        text: formatMessage({
            id: 'mobile.ios.photos_permission_denied_description',
            defaultMessage: 'Upload photos and videos to your Mattermost instance or save them to your device. Open Settings to grant Mattermost Read and Write access to your photo and video library.',
        }),
    };
};

const getStoragePermissionDeniedMessage = (intl: typeof intlShape) => {
    const {formatMessage} = intl;
    const applicationName = DeviceInfo.getApplicationName();
    return {
        title: formatMessage({
            id: 'mobile.storage_permission_denied_title',
            defaultMessage: '{applicationName} would like to access your files',
        }, {applicationName}),
        text: formatMessage({
            id: 'mobile.storage_permission_denied_description',
            defaultMessage: 'Upload files to your Mattermost instance. Open Settings to grant Mattermost Read and Write access to files on this device.',
        }),
    };
};

export const hasCameraPermission = async (intl: typeof intlShape) => {
    const {formatMessage} = intl;
    const targetSource = Platform.OS === 'ios' ? Permissions.PERMISSIONS.IOS.CAMERA : Permissions.PERMISSIONS.ANDROID.CAMERA;
    const hasPermission = await Permissions.check(targetSource);

    switch (hasPermission) {
    case Permissions.RESULTS.DENIED:
    case Permissions.RESULTS.UNAVAILABLE: {
        const permissionRequest = await Permissions.request(targetSource);

        return permissionRequest === Permissions.RESULTS.GRANTED;
    }
    case Permissions.RESULTS.BLOCKED: {
        const grantOption = {
            text: formatMessage({
                id: 'mobile.permission_denied_retry',
                defaultMessage: 'Settings',
            }),
            onPress: () => Permissions.openSettings(),
        };

        const {title, text} = getCameraPermissionDeniedMessage(intl);

        Alert.alert(
            title,
            text,
            [
                grantOption,
                {
                    text: formatMessage({
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

export const hasPhotoPermission = async (intl: typeof intlShape) => {
    const {formatMessage} = intl;
    const targetSource = Platform.OS === 'ios' ? Permissions.PERMISSIONS.IOS.PHOTO_LIBRARY : Permissions.PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;
    const hasPermission = await Permissions.check(targetSource);

    switch (hasPermission) {
    case Permissions.RESULTS.DENIED:
    case Permissions.RESULTS.UNAVAILABLE: {
        const permissionRequest = await Permissions.request(targetSource);

        return permissionRequest === Permissions.RESULTS.GRANTED;
    }
    case Permissions.RESULTS.BLOCKED: {
        const grantOption = {
            text: formatMessage({
                id: 'mobile.permission_denied_retry',
                defaultMessage: 'Settings',
            }),
            onPress: () => Permissions.openSettings(),
        };

        const {title, text} = getPhotoPermissionDeniedMessage(intl);

        Alert.alert(
            title,
            text,
            [
                grantOption,
                {
                    text: formatMessage({
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

export const hasStoragePermission = async (intl: typeof intlShape) => {
    if (Platform.OS === 'android') {
        const {formatMessage} = intl;
        const storagePermission = Permissions.PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;
        const hasPermissionToStorage = await Permissions.check(storagePermission);

        switch (hasPermissionToStorage) {
        case Permissions.RESULTS.DENIED:
        case Permissions.RESULTS.UNAVAILABLE: {
            const permissionRequest = await Permissions.request(storagePermission);

            return permissionRequest === Permissions.RESULTS.GRANTED;
        }
        case Permissions.RESULTS.BLOCKED: {
            const {title, text} = getStoragePermissionDeniedMessage(intl);

            Alert.alert(
                title,
                text,
                [
                    {
                        text: formatMessage({
                            id: 'mobile.permission_denied_dismiss',
                            defaultMessage: 'Don\'t Allow',
                        }),
                    },
                    {
                        text: formatMessage({
                            id: 'mobile.permission_denied_retry',
                            defaultMessage: 'Settings',
                        }),
                        onPress: () => AndroidOpenSettings.appDetailsSettings(),
                    },
                ],
            );
            return false;
        }
        }
    }

    return true;
};
