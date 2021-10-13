// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as FileSystem from 'expo-file-system';
import React, {PureComponent} from 'react';
import {injectIntl, IntlShape} from 'react-intl';
import {
    Alert,
    NativeModules,
    Platform,
    StyleSheet,
    StatusBar, DeviceEventEmitter,
} from 'react-native';
import AndroidOpenSettings from 'react-native-android-open-settings';
import DocumentPicker from 'react-native-document-picker';
import {launchImageLibrary, launchCamera, ImageLibraryOptions, CameraOptions} from 'react-native-image-picker';
import {MediaType} from 'react-native-image-picker/src/types';
import Permissions from 'react-native-permissions';

import {getPermissionMessages} from '@components/attachment_button/constant';
import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {Navigation, Files} from '@constants';
import {t} from '@i18n';
import {showModalOverCurrentContext} from '@screens/navigation';
import {lookupMimeType} from '@utils/file';
import {changeOpacity} from '@utils/theme';

const ShareExtension = NativeModules.MattermostShare;

type FileResponse= {
    assets?: File[];
    didCancel?: boolean;
    error?: Error;
}

type File = {
    fileName?: string;
    fileSize?: number;
    height?: number;
    path?: string;
    type: string;
    uri: string;
    width?: number;
}

type AttachmentButtonProps = {
    browseFileTypes: string; // 'public.item' | '*/*' | 'public.image' | 'images/*';
    canBrowseFiles?: boolean;
    canBrowsePhotoLibrary?: boolean;
    canBrowseVideoLibrary?: boolean;
    canTakePhoto?: boolean;
    canTakeVideo?: boolean;
    children: React.ReactNode;
    extraOptions: null | any[];
    fileCount: number;
    intl: IntlShape;
    maxFileCount?: number;
    maxFileSize: number;
    onShowFileMaxWarning: () => void;
    onShowFileSizeWarning: (fileName: string) => void;
    onShowUnsupportedMimeTypeWarning: () => void;
    theme: Theme;
    uploadFiles: (files: File[]) => void;
    wrapper: boolean;
}

const style = StyleSheet.create({
    attachIcon: {
        marginTop: Platform.select({
            ios: 2,
            android: -5,
        }),
    },
    buttonContainer: {
        height: Platform.select({
            ios: 34,
            android: 36,
        }),
        width: 45,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

class AttachmentButton extends PureComponent<AttachmentButtonProps> {
    static defaultProps = {
        browseFileTypes: Platform.OS === 'ios' ? 'public.item' : '*/*', // DocumentPicker.types.images
        canBrowseFiles: true,
        canBrowsePhotoLibrary: true,
        canBrowseVideoLibrary: true,
        canTakePhoto: true,
        canTakeVideo: true,
        maxFileCount: 5,
        extraOptions: null,
    };

    getPermissionDeniedMessage = (source: string, mediaType = '') => {
        const {intl} = this.props;
        switch (source) {
            case 'camera': {
                if (mediaType === 'video') {
                    return getPermissionMessages(intl).camera.video;
                }
                return getPermissionMessages(intl).camera.photo;
            }
            case 'storage':
                return getPermissionMessages(intl).storage;
            case 'video':
                return getPermissionMessages(intl).video;
            case 'photo':
            default: {
                if (Platform.OS === 'android') {
                    return getPermissionMessages(intl).denied.android;
                }

                return getPermissionMessages(intl).denied.ios;
            }
        }
    }

    attachPhotoFromCamera = () => {
        return this.attachFileFromCamera('camera', 'photo');
    };

    attachFileFromCamera = async (source: string, mediaType: MediaType) => {
        const options: CameraOptions = {
            quality: 0.8,
            videoQuality: 'high',
            mediaType,
            saveToPhotos: true,
        };

        const hasCameraPermission = await this.hasPhotoPermission(source, mediaType);

        if (hasCameraPermission) {
            launchCamera(options, async (response: FileResponse) => {
                StatusBar.setHidden(false);

                // emmProvider.inBackgroundSince = null;
                if (response.error || response.didCancel) {
                    return;
                }

                const files = await this.getFilesFromResponse(response);
                this.uploadFiles(files);
            });
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

        const hasPhotoPermission = await this.hasPhotoPermission('photo', 'photo');

        if (hasPhotoPermission) {
            launchImageLibrary(options, async (response: FileResponse) => {
                StatusBar.setHidden(false);

                // emmProvider.inBackgroundSince = null;
                if (response.error || response.didCancel) {
                    return;
                }

                const files = await this.getFilesFromResponse(response);
                this.uploadFiles(files);
            });
        }
    };

    attachVideoFromCamera = () => {
        return this.attachFileFromCamera('camera', 'video');
    };

    attachVideoFromLibraryAndroid = () => {
        const options: ImageLibraryOptions = {
            videoQuality: 'high',
            mediaType: 'video',
        };

        launchImageLibrary(options, async (response: FileResponse) => {
            // emmProvider.inBackgroundSince = null;
            if (response.error || response.didCancel) {
                return;
            }

            const files = await this.getFilesFromResponse(response);
            this.uploadFiles(files);
        });
    };

    attachFileFromFiles = async () => {
        const {browseFileTypes} = this.props;
        const hasPermission = await this.hasStoragePermission();

        if (hasPermission) {
            try {
                const res = await DocumentPicker.pickSingle({type: [browseFileTypes]});

                // emmProvider.inBackgroundSince = null;
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

                this.uploadFiles([res]);
            } catch (error) {
                // Do nothing
            }
        }
    };

    getFilesFromResponse = async (response: FileResponse): Promise<File[]> => {
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
    }

    hasPhotoPermission = async (source: string, mediaType = '') => {
        if (Platform.OS === 'ios') {
            const {intl: {formatMessage}} = this.props;
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
                        text: formatMessage({id: 'mobile.permission_denied_retry', defaultMessage: 'Settings'}),
                        onPress: () => Permissions.openSettings(),
                    };

                    const {title, text} = this.getPermissionDeniedMessage(source, mediaType);

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
        }

        return true;
    };

    hasStoragePermission = async () => {
        if (Platform.OS === 'android') {
            const {intl: {formatMessage}} = this.props;
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
                    const {title, text} = this.getPermissionDeniedMessage(storagePermission);

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

    uploadFiles = async (files: File[]) => {
        const {maxFileSize, onShowFileSizeWarning, onShowUnsupportedMimeTypeWarning, uploadFiles} = this.props;
        const file = files?.[0];

        if (!file) {
            return;
        }

        if (!file.fileSize || !file.fileName) {
            const path = (file?.path || file.uri).replace('file://', '');
            const fileInfo = await FileSystem.getInfoAsync(path);
            const uri = fileInfo.uri;
            file.fileSize = fileInfo.size;
            file.fileName = uri.substr(uri.lastIndexOf('/') + 1);
        }

        if (!file.type) {
            file.type = lookupMimeType(file.fileName);
        }

        if (!Files.VALID_MIME_TYPES.includes(file.type)) {
            onShowUnsupportedMimeTypeWarning();
        } else if (file!.fileSize! > maxFileSize) {
            onShowFileSizeWarning(file.fileName!);
        } else {
            uploadFiles(files);
        }
    };

    //todo: To test fully all use cases
    showFileAttachmentOptions = () => {
        const {
            canBrowseFiles,
            canBrowsePhotoLibrary,
            canBrowseVideoLibrary,
            canTakePhoto,
            canTakeVideo,
            extraOptions,
            fileCount,
            maxFileCount,
            onShowFileMaxWarning,
        } = this.props;

        if (fileCount === maxFileCount) {
            onShowFileMaxWarning();
            return;
        }

        DeviceEventEmitter.emit(Navigation.BLUR_POST_DRAFT);
        const items = [];

        if (canTakePhoto) {
            items.push({
                action: this.attachPhotoFromCamera,
                text: {
                    id: t('mobile.file_upload.camera_photo'),
                    defaultMessage: 'Take Photo',
                },
                icon: 'camera-outline',
            });
        }

        if (canTakeVideo) {
            items.push({
                action: this.attachVideoFromCamera,
                text: {
                    id: t('mobile.file_upload.camera_video'),
                    defaultMessage: 'Take Video',
                },
                icon: 'video-outline',
            });
        }

        if (canBrowsePhotoLibrary) {
            items.push({
                action: this.attachFileFromLibrary,
                text: {
                    id: t('mobile.file_upload.library'),
                    defaultMessage: 'Photo Library',
                },
                icon: 'file-image-outline',
            });
        }

        if (canBrowseVideoLibrary && Platform.OS === 'android') {
            items.push({
                action: this.attachVideoFromLibraryAndroid,
                text: {
                    id: t('mobile.file_upload.video'),
                    defaultMessage: 'Video Library',
                },
                icon: 'file-video-outline',
            });
        }

        if (canBrowseFiles) {
            items.push({
                action: this.attachFileFromFiles,
                text: {
                    id: t('mobile.file_upload.browse'),
                    defaultMessage: 'Browse Files',
                },
                icon: 'file-outline',
            });
        }

        if (extraOptions) {
            extraOptions.forEach((option) => {
                if (option !== null) {
                    items.push(option);
                }
            });
        }

        //fixme: perhaps you should use BottomSheet
        showModalOverCurrentContext('OptionsModal', {items});
    };

    render() {
        const {theme, wrapper, children} = this.props;

        if (wrapper) {
            return (
                <TouchableWithFeedback
                    onPress={this.showFileAttachmentOptions}
                    type={'opacity'}
                >
                    {children}
                </TouchableWithFeedback>
            );
        }

        return (
            <TouchableWithFeedback
                onPress={this.showFileAttachmentOptions}
                style={style.buttonContainer}
                type={'opacity'}
            >
                <CompassIcon
                    size={30}
                    style={style.attachIcon}
                    color={changeOpacity(theme.centerChannelColor, 0.9)}
                    name='plus'
                />
            </TouchableWithFeedback>
        );
    }
}

export default injectIntl(AttachmentButton);
