// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {
    Alert,
    Platform,
    StyleSheet,
} from 'react-native';
import RNFetchBlob from 'rn-fetch-blob';
import DeviceInfo from 'react-native-device-info';

import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import ImagePicker from 'react-native-image-picker';
import Permissions from 'react-native-permissions';

import {lookupMimeType} from 'mattermost-redux/utils/file_utils';

import TouchableWithFeedback from 'app/components/touchable_with_feedback';
import {PermissionTypes} from 'app/constants';

import {t} from 'app/utils/i18n';
import {showModalOverCurrentContext} from 'app/actions/navigation';

export default class AttachmentButton extends PureComponent {
    static propTypes = {
        blurTextBox: PropTypes.func.isRequired,
        validMimeTypes: PropTypes.array,
        canTakePhoto: PropTypes.bool,
        canTakeVideo: PropTypes.bool,
        fileCount: PropTypes.number,
        maxFileCount: PropTypes.number.isRequired,
        maxFileSize: PropTypes.number.isRequired,
        onShowFileMaxWarning: PropTypes.func,
        onShowFileSizeWarning: PropTypes.func,
        onShowUnsupportedMimeTypeWarning: PropTypes.func,
        theme: PropTypes.object.isRequired,
        uploadFiles: PropTypes.func.isRequired,
    };

    static defaultProps = {
        validMimeTypes: [],
        canTakePhoto: true,
        canTakeVideo: true,
        maxFileCount: 5,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    getPermissionDeniedMessage = (mediaType = '') => {
        const {formatMessage} = this.context.intl;
        const applicationName = DeviceInfo.getApplicationName();
        if (mediaType === 'video') {
            return {
                title: formatMessage({
                    id: 'mobile.camera_video_permission_denied_title',
                    defaultMessage: '{applicationName} would like to access your camera',
                }, {applicationName}),
                text: formatMessage({
                    id: 'mobile.camera_video_permission_denied_description',
                    defaultMessage: 'Take videos and upload them to your Mattermost instance or save them to your device. Open Settings to grant Mattermost Read and Write access to your camera.',
                }),
            };
        }

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
    }

    attachPhotoFromCamera = () => {
        return this.attachFileFromCamera('photo');
    };

    attachVideoFromCamera = () => {
        return this.attachFileFromCamera('video');
    };

    attachFileFromCamera = async (mediaType) => {
        const {formatMessage} = this.context.intl;
        const source = 'camera';
        const {title, text} = this.getPermissionDeniedMessage(mediaType);
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
                title,
                text,
                reTryTitle: formatMessage({
                    id: 'mobile.permission_denied_retry',
                    defaultMessage: 'Settings',
                }),
                okTitle: formatMessage({id: 'mobile.permission_denied_dismiss', defaultMessage: 'Don\'t Allow'}),
            },
        };

        const hasCameraPermission = await this.hasPhotoPermission(source, mediaType);

        if (hasCameraPermission) {
            ImagePicker.launchCamera(options, (response) => {
                if (response.error || response.didCancel) {
                    return;
                }

                this.uploadFiles([response]);
            });
        }
    };

    hasPhotoPermission = async (source, mediaType = '') => {
        if (Platform.OS === 'ios') {
            const {formatMessage} = this.context.intl;
            let permissionRequest;
            const targetSource = source || 'photo';
            const hasPermissionToStorage = await Permissions.check(targetSource);

            switch (hasPermissionToStorage) {
            case PermissionTypes.UNDETERMINED:
                permissionRequest = await Permissions.request(targetSource);
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
                            id: 'mobile.permission_denied_retry',
                            defaultMessage: 'Settings',
                        }),
                        onPress: () => Permissions.openSettings(),
                    };
                }

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
            canTakePhoto,
            canTakeVideo,
            fileCount,
            maxFileCount,
            onShowFileMaxWarning,
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

        showModalOverCurrentContext('OptionsModal', {items});
    };

    render() {
        const {theme} = this.props;
        const launchCamera = Platform.OS === 'ios' ? () => this.attachFileFromCamera('mixed') : this.showFileAttachmentOptions;

        return (
            <TouchableWithFeedback
                onPress={launchCamera}
                style={style.buttonContainer}
                type={'opacity'}
            >
                <MaterialCommunityIcons
                    color={theme.centerChannelColor}
                    name='camera-outline'
                    size={20}
                />
            </TouchableWithFeedback>
        );
    }
}

const style = StyleSheet.create({
    buttonContainer: {
        paddingLeft: 10,
        paddingRight: 10,
    },
});