// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {
    Alert,
    NativeModules,
    Platform,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import RNFetchBlob from 'rn-fetch-blob';

import Icon from 'react-native-vector-icons/Ionicons';
import {DocumentPicker} from 'react-native-document-picker';
import ImagePicker from 'react-native-image-picker';
import Permissions from 'react-native-permissions';

import {lookupMimeType} from 'mattermost-redux/utils/file_utils';

import {PermissionTypes} from 'app/constants';
import {changeOpacity} from 'app/utils/theme';
import {t} from 'app/utils/i18n';

const ShareExtension = NativeModules.MattermostShare;

export default class AttachmentButton extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            showModalOverCurrentContext: PropTypes.func.isRequired,
        }).isRequired,
        blurTextBox: PropTypes.func.isRequired,
        browseFileTypes: PropTypes.string,
        validMimeTypes: PropTypes.array,
        canBrowseFiles: PropTypes.bool,
        canBrowsePhotoLibrary: PropTypes.bool,
        canBrowseVideoLibrary: PropTypes.bool,
        canTakePhoto: PropTypes.bool,
        canTakeVideo: PropTypes.bool,
        children: PropTypes.node,
        fileCount: PropTypes.number,
        maxFileCount: PropTypes.number.isRequired,
        maxFileSize: PropTypes.number.isRequired,
        onShowFileMaxWarning: PropTypes.func,
        onShowFileSizeWarning: PropTypes.func,
        onShowUnsupportedMimeTypeWarning: PropTypes.func,
        theme: PropTypes.object.isRequired,
        uploadFiles: PropTypes.func.isRequired,
        wrapper: PropTypes.bool,
        extraOptions: PropTypes.arrayOf(PropTypes.object),
    };

    static defaultProps = {
        browseFileTypes: Platform.OS === 'ios' ? 'public.item' : '*/*',
        validMimeTypes: [],
        canBrowseFiles: true,
        canBrowsePhotoLibrary: true,
        canBrowseVideoLibrary: true,
        canTakePhoto: true,
        canTakeVideo: true,
        maxFileCount: 5,
        extraOptions: null,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    attachPhotoFromCamera = () => {
        return this.attachFileFromCamera('photo', 'camera');
    };

    attachFileFromCamera = async (mediaType, source) => {
        const {formatMessage} = this.context.intl;
        const options = {
            quality: 0.8,
            videoQuality: 'high',
            noData: true,
            mediaType,
            storageOptions: {
                cameraRoll: true,
                waitUntilSaved: true,
            },
            permissionDenied: {
                title: formatMessage({
                    id: 'mobile.android.camera_permission_denied_title',
                    defaultMessage: 'Camera access is required',
                }),
                text: formatMessage({
                    id: 'mobile.android.camera_permission_denied_description',
                    defaultMessage: 'To take photos and videos with your camera, please change your permission settings.',
                }),
                reTryTitle: formatMessage({
                    id: 'mobile.android.permission_denied_retry',
                    defaultMessage: 'Set Permission',
                }),
                okTitle: formatMessage({id: 'mobile.android.permission_denied_dismiss', defaultMessage: 'Dismiss'}),
            },
        };

        const hasPhotoPermission = await this.hasPhotoPermission(source);

        if (hasPhotoPermission) {
            ImagePicker.launchCamera(options, (response) => {
                if (response.error || response.didCancel) {
                    return;
                }

                this.uploadFiles([response]);
            });
        }
    };

    attachFileFromLibrary = () => {
        const {formatMessage} = this.context.intl;
        const options = {
            quality: 0.8,
            noData: true,
            permissionDenied: {
                title: formatMessage({
                    id: 'mobile.android.photos_permission_denied_title',
                    defaultMessage: 'Photo library access is required',
                }),
                text: formatMessage({
                    id: 'mobile.android.photos_permission_denied_description',
                    defaultMessage: 'To upload images from your library, please change your permission settings.',
                }),
                reTryTitle: formatMessage({
                    id: 'mobile.android.permission_denied_retry',
                    defaultMessage: 'Set Permission',
                }),
                okTitle: formatMessage({id: 'mobile.android.permission_denied_dismiss', defaultMessage: 'Dismiss'}),
            },
        };

        if (Platform.OS === 'ios') {
            options.mediaType = 'mixed';
        }

        ImagePicker.launchImageLibrary(options, (response) => {
            if (response.error || response.didCancel) {
                return;
            }

            this.uploadFiles([response]);
        });
    };

    attachVideoFromCamera = () => {
        return this.attachFileFromCamera('video', 'camera');
    };

    attachVideoFromLibraryAndroid = () => {
        const {formatMessage} = this.context.intl;
        const options = {
            videoQuality: 'high',
            mediaType: 'video',
            noData: true,
            permissionDenied: {
                title: formatMessage({
                    id: 'mobile.android.videos_permission_denied_title',
                    defaultMessage: 'Video library access is required',
                }),
                text: formatMessage({
                    id: 'mobile.android.videos_permission_denied_description',
                    defaultMessage: 'To upload videos from your library, please change your permission settings.',
                }),
                reTryTitle: formatMessage({
                    id: 'mobile.android.permission_denied_retry',
                    defaultMessage: 'Set Permission',
                }),
                okTitle: formatMessage({id: 'mobile.android.permission_denied_dismiss', defaultMessage: 'Dismiss'}),
            },
        };

        ImagePicker.launchImageLibrary(options, (response) => {
            if (response.error || response.didCancel) {
                return;
            }

            this.uploadFiles([response]);
        });
    };

    attachFileFromFiles = async () => {
        const {browseFileTypes} = this.props;
        const hasPermission = await this.hasStoragePermission();

        if (hasPermission) {
            DocumentPicker.show({
                filetype: [browseFileTypes],
            }, async (error, res) => {
                if (error) {
                    return;
                }

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
            });
        }
    };

    hasPhotoPermission = async (source) => {
        if (Platform.OS === 'ios') {
            const {formatMessage} = this.context.intl;
            let permissionRequest;
            const hasPermissionToStorage = await Permissions.check(source || 'photo');

            switch (hasPermissionToStorage) {
            case PermissionTypes.UNDETERMINED:
                permissionRequest = await Permissions.request('photo');
                if (permissionRequest !== PermissionTypes.AUTHORIZED) {
                    return false;
                }
                break;
            case PermissionTypes.DENIED: {
                const canOpenSettings = await Permissions.canOpenSettings();
                let grantOption = null;
                if (canOpenSettings) {
                    grantOption = {
                        text: formatMessage({
                            id: 'mobile.android.permission_denied_retry',
                            defaultMessage: 'Set permission',
                        }),
                        onPress: () => Permissions.openSettings(),
                    };
                }

                Alert.alert(
                    formatMessage({
                        id: 'mobile.android.photos_permission_denied_title',
                        defaultMessage: 'Photo library access is required',
                    }),
                    formatMessage({
                        id: 'mobile.android.photos_permission_denied_description',
                        defaultMessage: 'To upload images from your library, please change your permission settings.',
                    }),
                    [
                        grantOption,
                        {
                            text: formatMessage({
                                id: 'mobile.android.permission_denied_dismiss',
                                defaultMessage: 'Dismiss',
                            }),
                        },
                    ]
                );
                return false;
            }
            }
        }

        return true;
    };

    hasStoragePermission = async () => {
        if (Platform.OS === 'android') {
            const {formatMessage} = this.context.intl;
            let permissionRequest;
            const hasPermissionToStorage = await Permissions.check('storage');

            switch (hasPermissionToStorage) {
            case PermissionTypes.UNDETERMINED:
                permissionRequest = await Permissions.request('storage');
                if (permissionRequest !== PermissionTypes.AUTHORIZED) {
                    return false;
                }
                break;
            case PermissionTypes.DENIED: {
                const canOpenSettings = await Permissions.canOpenSettings();
                let grantOption = null;
                if (canOpenSettings) {
                    grantOption = {
                        text: formatMessage({
                            id: 'mobile.android.permission_denied_retry',
                            defaultMessage: 'Set permission',
                        }),
                        onPress: () => Permissions.openSettings(),
                    };
                }

                Alert.alert(
                    formatMessage({
                        id: 'mobile.android.storage_permission_denied_title',
                        defaultMessage: 'File Storage access is required',
                    }),
                    formatMessage({
                        id: 'mobile.android.storage_permission_denied_description',
                        defaultMessage: 'To upload images from your Android device, please change your permission settings.',
                    }),
                    [
                        {
                            text: formatMessage({
                                id: 'mobile.android.permission_denied_dismiss',
                                defaultMessage: 'Dismiss',
                            }),
                        },
                        grantOption,
                    ]
                );
                return false;
            }
            }
        }

        return true;
    };

    uploadFiles = async (files) => {
        const file = files[0];
        if (!file.fileSize | !file.fileName) {
            const path = (file.path || file.uri).replace('file://', '');
            const fileInfo = await RNFetchBlob.fs.stat(path);
            file.fileSize = fileInfo.size;
            file.fileName = fileInfo.filename;
        }

        if (!file.type) {
            file.type = lookupMimeType(file.fileName);
        }

        const {validMimeTypes} = this.props;
        if (validMimeTypes.length && !validMimeTypes.includes(file.type)) {
            this.props.onShowUnsupportedMimeTypeWarning();
        } else if (file.fileSize > this.props.maxFileSize) {
            this.props.onShowFileSizeWarning(file.fileName);
        } else {
            this.props.uploadFiles(files);
        }
    };

    showFileAttachmentOptions = () => {
        const {
            canBrowseFiles,
            canBrowsePhotoLibrary,
            canBrowseVideoLibrary,
            canTakePhoto,
            canTakeVideo,
            fileCount,
            maxFileCount,
            onShowFileMaxWarning,
            extraOptions,
            actions,
        } = this.props;

        if (fileCount === maxFileCount) {
            onShowFileMaxWarning();
            return;
        }

        this.props.blurTextBox();
        const items = [];

        if (canTakePhoto) {
            items.push({
                action: this.attachPhotoFromCamera,
                text: {
                    id: t('mobile.file_upload.camera_photo'),
                    defaultMessage: 'Take Photo',
                },
                icon: 'camera',
            });
        }

        if (canTakeVideo) {
            items.push({
                action: this.attachVideoFromCamera,
                text: {
                    id: t('mobile.file_upload.camera_video'),
                    defaultMessage: 'Take Video',
                },
                icon: 'video-camera',
            });
        }

        if (canBrowsePhotoLibrary) {
            items.push({
                action: this.attachFileFromLibrary,
                text: {
                    id: t('mobile.file_upload.library'),
                    defaultMessage: 'Photo Library',
                },
                icon: 'photo',
            });
        }

        if (canBrowseVideoLibrary && Platform.OS === 'android') {
            items.push({
                action: this.attachVideoFromLibraryAndroid,
                text: {
                    id: t('mobile.file_upload.video'),
                    defaultMessage: 'Video Library',
                },
                icon: 'file-video-o',
            });
        }

        if (canBrowseFiles) {
            items.push({
                action: this.attachFileFromFiles,
                text: {
                    id: t('mobile.file_upload.browse'),
                    defaultMessage: 'Browse Files',
                },
                icon: 'file',
            });
        }

        if (extraOptions) {
            extraOptions.forEach((option) => {
                if (option !== null) {
                    items.push(option);
                }
            });
        }

        actions.showModalOverCurrentContext('OptionsModal', {items});
    };

    render() {
        const {theme, wrapper, children} = this.props;

        if (wrapper) {
            return (
                <TouchableOpacity
                    onPress={this.showFileAttachmentOptions}
                >
                    {children}
                </TouchableOpacity>
            );
        }

        return (
            <TouchableOpacity
                onPress={this.showFileAttachmentOptions}
                style={style.buttonContainer}
            >
                <Icon
                    size={30}
                    style={style.attachIcon}
                    color={changeOpacity(theme.centerChannelColor, 0.9)}
                    name='md-add'
                />
            </TouchableOpacity>
        );
    }
}

const style = StyleSheet.create({
    attachIcon: {
        marginTop: Platform.select({
            ios: 2,
            android: 0,
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
