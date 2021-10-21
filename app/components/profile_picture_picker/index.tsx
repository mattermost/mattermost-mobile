// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as FileSystem from 'expo-file-system';
import React, {PureComponent} from 'react';
import {injectIntl, IntlShape} from 'react-intl';
import {Alert, NativeModules, Platform, StyleSheet, StatusBar, DeviceEventEmitter} from 'react-native';
import AndroidOpenSettings from 'react-native-android-open-settings';
import DocumentPicker from 'react-native-document-picker';
import {launchImageLibrary, launchCamera, ImageLibraryOptions, CameraOptions} from 'react-native-image-picker';
import Permissions from 'react-native-permissions';

import {Client} from '@client/rest';
import CompassIcon from '@components/compass_icon';
import {getPermissionMessages} from '@components/profile_picture_picker/constant';
import SlideUpPanelItem, {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {Navigation, Files} from '@constants';
import {t} from '@i18n';
import NetworkManager from '@init/network_manager';
import {VALID_MIME_TYPES} from '@screens/edit_profile/constants';
import {bottomSheet} from '@screens/navigation';
import UserModel from '@typings/database/models/servers/user';
import {lookupMimeType} from '@utils/file';
import {changeOpacity} from '@utils/theme';

import type {ExtraOptions, File, FileResponse} from '@typings/screens/edit_profile';

const ShareExtension = NativeModules.MattermostShare;

type ProfileImageButtonProps = {
    browseFileTypes: string;
    canBrowseFiles?: boolean;
    canBrowsePhotoLibrary?: boolean;
    canTakePhoto?: boolean;
    currentUser: UserModel;
    extraOptions?: ExtraOptions[];
    intl: IntlShape;
    maxFileSize: number;
    onShowFileSizeWarning: (fileName: string) => void;
    onShowUnsupportedMimeTypeWarning: () => void;
    removeProfileImage: () => void;
    serverUrl: string;
    theme: Theme;
    uploadFiles: (files: File[]) => void;
    wrapper: boolean;
};

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

class ProfilePictureButton extends PureComponent<ProfileImageButtonProps> {
    static defaultProps = {
        browseFileTypes: Platform.OS === 'ios' ? 'public.item' : '*/*',
        canBrowseFiles: true,
        canBrowsePhotoLibrary: true,
        canTakePhoto: true,
        maxFileCount: 1,
        fileCount: 1,
        extraOptions: [],
    };

    getPermissionDeniedMessage = (source: string) => {
        const {intl} = this.props;
        switch (source) {
            case 'camera': {
                return getPermissionMessages(intl).camera;
            }
            case 'storage':
                return getPermissionMessages(intl).storage;
            case 'photo':
            default: {
                if (Platform.OS === 'android') {
                    return getPermissionMessages(intl).denied.android;
                }

                return getPermissionMessages(intl).denied.ios;
            }
        }
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

                // emmProvider.inBackgroundSince = null;
                if (response.error || response.didCancel) {
                    return;
                }

                const files = await this.getFilesFromResponse(response);
                await this.uploadFiles(files);
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

        const hasPhotoPermission = await this.hasPhotoPermission('photo');

        if (hasPhotoPermission) {
            launchImageLibrary(options, async (response: FileResponse) => {
                StatusBar.setHidden(false);

                // emmProvider.inBackgroundSince = null;
                if (response.error || response.didCancel) {
                    return;
                }

                const files = await this.getFilesFromResponse(response);
                await this.uploadFiles(files);
            });
        }
    };

    attachFileFromFiles = async () => {
        const {browseFileTypes} = this.props;
        const hasPermission = await this.hasStoragePermission();

        if (hasPermission) {
            try {
                const res = await DocumentPicker.pickSingle({type: [browseFileTypes]}) as unknown as File;

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
    };

    hasPhotoPermission = async (source: string) => {
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
                        text: formatMessage({
                            id: 'mobile.permission_denied_retry',
                            defaultMessage: 'Settings',
                        }),
                        onPress: () => Permissions.openSettings(),
                    };

                    const {title, text} = this.getPermissionDeniedMessage(source);

                    Alert.alert(title, text, [
                        grantOption,
                        {
                            text: formatMessage({
                                id: 'mobile.permission_denied_dismiss',
                                defaultMessage: "Don't Allow",
                            }),
                        },
                    ]);
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
                    permissionRequest = await Permissions.request(
                        storagePermission,
                    );
                    if (permissionRequest !== Permissions.RESULTS.GRANTED) {
                        return false;
                    }
                    break;
                case Permissions.RESULTS.BLOCKED: {
                    const {title, text} =
                        this.getPermissionDeniedMessage(storagePermission);

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
            const path = Platform.OS === 'ios' ? (file?.path || file.uri).replace('file://', '') : (file?.path || file.uri);
            const fileInfo = await FileSystem.getInfoAsync(path);
            const uri = fileInfo.uri;
            file.fileSize = fileInfo.size;
            file.fileName = uri.substr(uri.lastIndexOf('/') + 1);
        }

        if (!file.type) {
            file.type = lookupMimeType(file.fileName) as typeof VALID_MIME_TYPES[number];
        }

        if (!Files.VALID_MIME_TYPES.includes(file.type)) {
            onShowUnsupportedMimeTypeWarning();
        } else if (file!.fileSize! > maxFileSize) {
            onShowFileSizeWarning(file.fileName!);
        } else {
            DeviceEventEmitter.emit(Navigation.NAVIGATION_CLOSE_MODAL);
            uploadFiles(files);
        }
    };

    getRemoveProfileImageOption = () => {
        const {currentUser, removeProfileImage, serverUrl} = this.props;
        const {id, lastPictureUpdate} = currentUser;

        let client: Client | undefined;
        let profileImageUrl: string | undefined;

        try {
            client = NetworkManager.getClient(serverUrl);
            profileImageUrl = client.getProfilePictureUrl(id, lastPictureUpdate);
        } catch {
            // does nothing
        }

        // Check if image url includes query string for timestamp. If so, it means the image has been updated from the default, i.e. '.../image?_=1544159746868'
        if (profileImageUrl?.includes('?')) {
            return {
                ...(removeProfileImage && {
                    action: () => {
                        DeviceEventEmitter.emit(Navigation.NAVIGATION_CLOSE_MODAL);
                        return removeProfileImage();
                    }}),
                text: {
                    id: t('mobile.edit_profile.remove_profile_photo'),
                    defaultMessage: 'Remove Photo',
                },
                textStyle: {
                    color: '#CC3239',
                },
                icon: 'trash-can-outline',
                iconStyle: {
                    color: '#CC3239',
                },
            };
        }

        return null;
    };

    showFileAttachmentOptions = () => {
        const {canBrowseFiles, canBrowsePhotoLibrary, canTakePhoto, intl, theme} = this.props;

        DeviceEventEmitter.emit(Navigation.BLUR_POST_DRAFT);

        const removeImageOption = this.getRemoveProfileImageOption();

        const renderContent = () => {
            return (
                <>
                    {canTakePhoto && (
                        <SlideUpPanelItem
                            icon='camera-outline'
                            onPress={this.attachFileFromCamera}
                            testID='attachment.canTakePhoto'
                            text={intl.formatMessage({
                                id: 'mobile.file_upload.camera_photo',
                                defaultMessage: 'Take Photo',
                            })}
                        />
                    )}

                    {canBrowsePhotoLibrary && (
                        <SlideUpPanelItem
                            icon='file-generic-outline'
                            onPress={this.attachFileFromLibrary}
                            testID='attachment.canBrowsePhotoLibrary'
                            text={intl.formatMessage({
                                id: 'mobile.file_upload.library',
                                defaultMessage: 'Photo Library',
                            })}
                        />
                    )}

                    {canBrowseFiles && (
                        <SlideUpPanelItem
                            icon='file-multiple-outline'
                            onPress={this.attachFileFromFiles}
                            testID='attachment.canBrowseFiles'
                            text={intl.formatMessage({
                                id: 'mobile.file_upload.browse',
                                defaultMessage: 'Browse Files',
                            })}
                        />
                    )}

                    {removeImageOption && (
                        <SlideUpPanelItem
                            destructive={true}
                            icon={removeImageOption.icon}
                            onPress={removeImageOption.action}
                            testID='attachment.removeImage'
                            text={intl.formatMessage({
                                id: removeImageOption.text.id,
                                defaultMessage: removeImageOption.text.defaultMessage,
                            })}
                        />
                    )}
                </>
            );
        };

        bottomSheet({
            closeButtonId: 'close-edit-profile',
            renderContent,
            snapPoints: [(5 * ITEM_HEIGHT) + 10, 10],
            title: '',
            theme,
        });
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

export default injectIntl(ProfilePictureButton);
