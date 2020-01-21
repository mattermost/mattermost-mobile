// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {
    Alert,
    Platform,
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import {ICON_SIZE} from 'app/constants/post_textbox';

import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import ImagePicker from 'react-native-image-picker';
import Permissions from 'react-native-permissions';

import {changeOpacity} from 'app/utils/theme';

import TouchableWithFeedback from 'app/components/touchable_with_feedback';

export default class AttachmentButton extends PureComponent {
    static propTypes = {
        fileCount: PropTypes.number,
        maxFileCount: PropTypes.number.isRequired,
        onShowFileMaxWarning: PropTypes.func,
        theme: PropTypes.object.isRequired,
        uploadFiles: PropTypes.func.isRequired,
        buttonContainerStyle: PropTypes.object,
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

    getPermissionDeniedMessage = () => {
        const {formatMessage} = this.context.intl;
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
    }

    attachFileFromCamera = async () => {
        const {formatMessage} = this.context.intl;
        const {
            fileCount,
            maxFileCount,
            onShowFileMaxWarning,
        } = this.props;

        const {title, text} = this.getPermissionDeniedMessage();

        if (fileCount === maxFileCount) {
            onShowFileMaxWarning();
            return;
        }

        const options = {
            quality: 0.8,
            videoQuality: 'high',
            noData: true,
            mediaType: 'mixed',
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

        const hasCameraPermission = await this.hasCameraPermission();

        if (hasCameraPermission) {
            ImagePicker.launchCamera(options, (response) => {
                if (response.error || response.didCancel) {
                    return;
                }

                this.props.uploadFiles([response]);
            });
        }
    };

    hasCameraPermission = async () => {
        if (Platform.OS === 'ios') {
            const {formatMessage} = this.context.intl;
            let permissionRequest;
            const targetSource = 'camera';
            const hasPermissionToStorage = await Permissions.check(targetSource);

            switch (hasPermissionToStorage) {
            case Permissions.RESULTS.UNAVAILABLE:
                permissionRequest = await Permissions.request(targetSource);
                if (permissionRequest !== Permissions.RESULTS.AUTHORIZED) {
                    return false;
                }
                break;
            case Permissions.RESULTS.BLOCKED: {
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

                const {title, text} = this.getPermissionDeniedMessage();

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

    render() {
        const {theme, buttonContainerStyle} = this.props;
        return (
            <TouchableWithFeedback
                onPress={this.attachFileFromCamera}
                style={buttonContainerStyle}
                type={'opacity'}
            >
                <MaterialCommunityIcons
                    color={changeOpacity(theme.centerChannelColor, 0.64)}
                    name='camera-outline'
                    size={ICON_SIZE}
                />
            </TouchableWithFeedback>
        );
    }
}
