// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {
    Alert,
    NativeModules,
    Platform,
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import {ICON_SIZE} from 'app/constants/post_textbox';
import AndroidOpenSettings from 'react-native-android-open-settings';

import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import DocumentPicker from 'react-native-document-picker';
import Permissions from 'react-native-permissions';

import {changeOpacity} from 'app/utils/theme';

import TouchableWithFeedback from 'app/components/touchable_with_feedback';
import {PermissionTypes} from 'app/constants';

const ShareExtension = NativeModules.MattermostShare;

export default class FileUploadButton extends PureComponent {
    static propTypes = {
        blurTextBox: PropTypes.func.isRequired,
        browseFileTypes: PropTypes.string,
        fileCount: PropTypes.number,
        maxFileCount: PropTypes.number.isRequired,
        onShowFileMaxWarning: PropTypes.func,
        theme: PropTypes.object.isRequired,
        uploadFiles: PropTypes.func.isRequired,
        buttonContainerStyle: PropTypes.object,
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

    getPermissionDeniedMessage = () => {
        const {formatMessage} = this.context.intl;
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
    }

    attachFileFromFiles = async () => {
        const {browseFileTypes} = this.props;
        const hasPermission = await this.hasStoragePermission();

        if (hasPermission) {
            try {
                const res = await DocumentPicker.pick({type: [browseFileTypes]});
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

                this.props.uploadFiles([res]);
            } catch (error) {
                // Do nothing
            }
        }
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
                const {title, text} = this.getPermissionDeniedMessage();

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
                    ]
                );
                return false;
            }
            }
        }

        return true;
    };

    handleButtonPress = () => {
        const {
            fileCount,
            maxFileCount,
            onShowFileMaxWarning,
        } = this.props;

        if (fileCount === maxFileCount) {
            onShowFileMaxWarning();
            return;
        }
        this.props.blurTextBox();
        this.attachFileFromFiles();
    };

    render() {
        const {theme, buttonContainerStyle} = this.props;
        return (
            <TouchableWithFeedback
                onPress={this.handleButtonPress}
                style={buttonContainerStyle}
                type={'opacity'}
            >
                <MaterialCommunityIcons
                    color={changeOpacity(theme.centerChannelColor, 0.64)}
                    name='file-document-outline'
                    size={ICON_SIZE}
                />
            </TouchableWithFeedback>
        );
    }
}
