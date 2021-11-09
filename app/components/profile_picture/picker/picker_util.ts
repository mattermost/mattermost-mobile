// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as FileSystem from 'expo-file-system';
import {IntlShape} from 'react-intl';
import {Alert, DeviceEventEmitter, NativeModules, Platform, StatusBar} from 'react-native';
import AndroidOpenSettings from 'react-native-android-open-settings';
import DeviceInfo from 'react-native-device-info';
import DocumentPicker from 'react-native-document-picker';
import {CameraOptions, ImageLibraryOptions, launchCamera, launchImageLibrary} from 'react-native-image-picker';
import Permissions from 'react-native-permissions';

import {Client} from '@client/rest';
import {Files, Navigation} from '@constants';
import NetworkManager from '@init/network_manager';
import {VALID_MIME_TYPES} from '@screens/edit_profile/constants';
import UserModel from '@typings/database/models/servers/user';
import {File, FileResponse} from '@typings/screens/edit_profile';
import {lookupMimeType} from '@utils/file';

const ShareExtension = NativeModules.MattermostShare;

type PermissionSource = 'camera' | 'storage' | 'denied_android' | 'denied_ios' | 'photo';

export default class PickerUtil {
    private readonly maxFileSize: number;
    private readonly onShowFileSizeWarning: (fileName: string) => void;
    private readonly onShowUnsupportedMimeTypeWarning: () => void;
    private readonly uploadFiles: (files: File[]) => void;
    private readonly intl: IntlShape;

    constructor(
        intl: IntlShape,
        maxFileSize: number,
        onShowFileSizeWarning: (fileName: string) => void,
        onShowUnsupportedMimeTypeWarning: () => void,
        uploadFiles: (files: File[]) => void,
    ) {
        this.intl = intl;
        this.maxFileSize = maxFileSize;
        this.onShowFileSizeWarning = onShowFileSizeWarning;
        this.onShowUnsupportedMimeTypeWarning = onShowUnsupportedMimeTypeWarning;
        this.uploadFiles = uploadFiles;
    }

    private getPermissionMessages = (source: PermissionSource) => {
        const {formatMessage} = this.intl;
        const applicationName = DeviceInfo.getApplicationName();

        const permissions: Record<string, { title: string; text: string }> = {
            camera: {
                title: formatMessage(
                    {
                        id: 'mobile.camera_photo_permission_denied_title',
                        defaultMessage:
                            '{applicationName} would like to access your camera',
                    },
                    {applicationName},
                ),
                text: formatMessage({
                    id: 'mobile.camera_photo_permission_denied_description',
                    defaultMessage:
                        'Take photos and upload them to your Mattermost instance or save them to your device. Open Settings to grant Mattermost Read and Write access to your camera.',
                }),
            },
            storage: {
                title: formatMessage(
                    {
                        id: 'mobile.storage_permission_denied_title',
                        defaultMessage:
                            '{applicationName} would like to access your files',
                    },
                    {applicationName},
                ),
                text: formatMessage({
                    id: 'mobile.storage_permission_denied_description',
                    defaultMessage:
                        'Upload files to your Mattermost instance. Open Settings to grant Mattermost Read and Write access to files on this device.',
                }),
            },
            denied_ios: {
                title: formatMessage(
                    {
                        id: 'mobile.ios.photos_permission_denied_title',
                        defaultMessage:
                            '{applicationName} would like to access your photos',
                    },
                    {applicationName},
                ),
                text: formatMessage({
                    id: 'mobile.ios.photos_permission_denied_description',
                    defaultMessage:
                        'Upload photos and videos to your Mattermost instance or save them to your device. Open Settings to grant Mattermost Read and Write access to your photo and video library.',
                }),
            },
            denied_android: {
                title: formatMessage(
                    {
                        id: 'mobile.android.photos_permission_denied_title',
                        defaultMessage:
                            '{applicationName} would like to access your photos',
                    },
                    {applicationName},
                ),
                text: formatMessage({
                    id: 'mobile.android.photos_permission_denied_description',
                    defaultMessage:
                        'Upload photos to your Mattermost instance or save them to your device. Open Settings to grant Mattermost Read and Write access to your photo library.',
                }),
            },
        };

        return permissions[source];
    };

    private prepareFileUpload = async (files: File[]) => {
        const file = files?.[0];

        if (!file) {
            return;
        }

        if (!file.fileSize || !file.fileName) {
            const path = Platform.select({
                ios: (file?.path || file.uri).replace('file://', ''),
                android: file?.path || file.uri,
            });

            const fileInfo = await FileSystem.getInfoAsync(path!);
            const uri = fileInfo.uri;

            file.fileSize = fileInfo.size;
            file.fileName = uri.substr(uri.lastIndexOf('/') + 1);
        }

        if (!file.type) {
            file.type = lookupMimeType(file.fileName) as typeof VALID_MIME_TYPES[number];
        }

        if (!Files.VALID_MIME_TYPES.includes(file.type)) {
            this.onShowUnsupportedMimeTypeWarning();
        } else if (file!.fileSize! > this.maxFileSize) {
            this.onShowFileSizeWarning(file.fileName!);
        } else {
            DeviceEventEmitter.emit(Navigation.NAVIGATION_CLOSE_MODAL);
            this.uploadFiles(files);
        }
    };

    private getPermissionDeniedMessage = (source?: PermissionSource) => {
        const sources = ['camera', 'storage', 'photo'];
        const deniedSource: PermissionSource = Platform.select({android: 'denied_android', ios: 'denied_ios'})!;
        const msgForSource = source && sources.includes(source) ? source : deniedSource;

        return this.getPermissionMessages(msgForSource);
    };

    private getFilesFromResponse = async (response: FileResponse): Promise<File[]> => {
        const files = [];
        const file = response?.assets?.[0];

        if (!file) {
            return [];
        }

        if (Platform.OS === 'android') {
            // For android we need to retrieve the realPath in case the file being imported is from the cloud
            const uri = (await ShareExtension.getFilePath(file.uri)).filePath;
            const type = file.type || lookupMimeType(uri);
            let fileName = file.fileName;
            if (type.includes('video/')) {
                fileName = uri.split('\\').pop().split('/').pop();
            }

            if (uri) {
                files.push({...file, fileName, uri, type});
            }
        } else {
            files.push(file);
        }
        return files;
    };

    private hasPhotoPermission = async (source: PermissionSource) => {
        if (Platform.OS === 'android') {
            return true;
        }

        let permissionRequest;
        const targetSource = source === 'camera' ? Permissions.PERMISSIONS.IOS.CAMERA : Permissions.PERMISSIONS.IOS.PHOTO_LIBRARY;
        const hasPermissionToStorage = await Permissions.check(targetSource);

        switch (hasPermissionToStorage) {
            case Permissions.RESULTS.DENIED:
                permissionRequest = await Permissions.request(targetSource);
                if (permissionRequest !== Permissions.RESULTS.GRANTED) {
                    return false;
                }
                break;
            case Permissions.RESULTS.BLOCKED: {
                const grantOption = {
                    text: this.intl.formatMessage({
                        id: 'mobile.permission_denied_retry',
                        defaultMessage: 'Settings',
                    }),
                    onPress: () => Permissions.openSettings(),
                };

                const {title, text} = this.getPermissionDeniedMessage(source);

                Alert.alert(title, text, [
                    grantOption,
                    {
                        text: this.intl.formatMessage({
                            id: 'mobile.permission_denied_dismiss',
                            defaultMessage: "Don't Allow",
                        }),
                    },
                ]);
                return false;
            }
        }
        return false;
    }

    private hasStoragePermission = async (intl: IntlShape) => {
        if (Platform.OS === 'ios') {
            return true;
        }

        const {formatMessage} = intl;
        const storagePermission = Permissions.PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;
        let permissionRequest;
        const hasPermissionToStorage = await Permissions.check(storagePermission);

        switch (hasPermissionToStorage) {
            case Permissions.RESULTS.DENIED:
                permissionRequest = await Permissions.request(storagePermission);
                if (permissionRequest !== Permissions.RESULTS.GRANTED) {
                    return false;
                }
                break;
            case Permissions.RESULTS.BLOCKED: {
                const {title, text} = this.getPermissionDeniedMessage();

                Alert.alert(title, text, [
                    {
                        text: formatMessage({
                            id: 'mobile.permission_denied_dismiss',
                            defaultMessage: "Don't Allow",
                        }),
                    },
                    {
                        text: formatMessage({
                            id: 'mobile.permission_denied_retry',
                            defaultMessage: 'Settings',
                        }),
                        onPress: () => AndroidOpenSettings.appDetailsSettings(),
                    },
                ]);
                return false;
            }
        }

        return false;
    };

    attachFileFromCamera = async () => {
        const options: CameraOptions = {
            quality: 0.8,
            videoQuality: 'high',
            mediaType: 'photo',
            saveToPhotos: true,
        };

        const hasCameraPermission = await this.hasPhotoPermission('camera');

        if (hasCameraPermission) {
            launchCamera(options, async (response: FileResponse) => {
                StatusBar.setHidden(false);

                if (response.error || response.didCancel) {
                    return;
                }

                const files = await this.getFilesFromResponse(response);
                await this.prepareFileUpload(files);
            });
        }
    };

    attachFileFromFiles = async (intl: IntlShape, browseFileType?: string) => {
        const hasPermission = await this.hasStoragePermission(intl);
        const fileType =
            browseFileType ??
            Platform.select({ios: 'public.item', android: '*/*'})!;

        if (hasPermission) {
            try {
                const res = (await DocumentPicker.pickSingle({type: [fileType]})) as unknown as File;

                if (Platform.OS === 'android') {
                    // For android we need to retrieve the realPath in case the file being imported is from the cloud
                    const newUri = await ShareExtension.getFilePath(res.uri);
                    if (newUri.filePath) {
                        res.uri = newUri.filePath;
                    } else {
                        return;
                    }
                }

                // Decode file uri to get the actual path
                res.uri = decodeURIComponent(res.uri);

                await this.prepareFileUpload([res]);
            } catch (error) {
                // Do nothing
            }
        }
    };

    attachFileFromLibrary = async () => {
        const options: ImageLibraryOptions = {
            quality: 1,
            mediaType: 'mixed',
            includeBase64: false,
        };

        if (Platform.OS === 'ios') {
            options.mediaType = 'mixed';
        }

        const hasPermission = await this.hasPhotoPermission('photo');

        if (hasPermission) {
            launchImageLibrary(options, async (response: FileResponse) => {
                StatusBar.setHidden(false);
                if (response.error || response.didCancel) {
                    return;
                }

                const files = await this.getFilesFromResponse(response);
                await this.prepareFileUpload(files);
            });
        }
    };

    hasPictureUrl = (user: UserModel, serverUrl: string) => {
        const {id, lastPictureUpdate} = user;

        let client: Client | undefined;
        let profileImageUrl: string | undefined;

        try {
            client = NetworkManager.getClient(serverUrl);
            profileImageUrl = client.getProfilePictureUrl(id, lastPictureUpdate);
        } catch {
            // does nothing
        }

        // Check if image url includes query string for timestamp. If so, it means the image has been updated from the default, i.e. '.../image?_=1544159746868'
        return Boolean(profileImageUrl?.includes('?'));
    };
}
