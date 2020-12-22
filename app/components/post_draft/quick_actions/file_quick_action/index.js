// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {Alert, NativeModules, Platform, StyleSheet} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import AndroidOpenSettings from 'react-native-android-open-settings';
import DocumentPicker from 'react-native-document-picker';
import Permissions from 'react-native-permissions';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {NavigationTypes} from '@constants';
import {ICON_SIZE, MAX_FILE_COUNT_WARNING} from '@constants/post_draft';
import EventEmitter from '@mm-redux/utils/event_emitter';
import {changeOpacity} from '@utils/theme';

const ShareExtension = NativeModules.MattermostShare;

export default class FileQuickAction extends PureComponent {
    static propTypes = {
        testID: PropTypes.string,
        disabled: PropTypes.bool,
        fileCount: PropTypes.number,
        maxFileCount: PropTypes.number,
        onUploadFiles: PropTypes.func.isRequired,
        theme: PropTypes.object.isRequired,
    };

    static defaultProps = {
        fileCount: 0,
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
        const hasPermission = await this.hasStoragePermission();
        const browseFileTypes = Platform.OS === 'ios' ? 'public.item' : '*/*';

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

                if (Platform.OS === 'ios') {
                    // Decode file uri to get the actual path
                    res.uri = decodeURIComponent(res.uri);
                }

                this.props.onUploadFiles([res]);
            } catch (error) {
                // Do nothing
            }
        }
    };

    hasStoragePermission = async () => {
        if (Platform.OS === 'android') {
            const {formatMessage} = this.context.intl;
            const storagePermission = Permissions.PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;
            const hasPermissionToStorage = await Permissions.check(storagePermission);

            switch (hasPermissionToStorage) {
            case Permissions.RESULTS.DENIED:
            case Permissions.RESULTS.UNAVAILABLE: {
                const permissionRequest = await Permissions.request(storagePermission);

                return permissionRequest === Permissions.RESULTS.GRANTED;
            }
            case Permissions.RESULTS.BLOCKED: {
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
                    ],
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
        } = this.props;

        if (fileCount === maxFileCount) {
            EventEmitter.emit(MAX_FILE_COUNT_WARNING);
            return;
        }

        EventEmitter.emit(NavigationTypes.BLUR_POST_DRAFT);
        this.attachFileFromFiles();
    };

    render() {
        const {testID, disabled, theme} = this.props;
        const actionTestID = disabled ?
            `${testID}.disabled` :
            testID;
        const color = disabled ?
            changeOpacity(theme.centerChannelColor, 0.16) :
            changeOpacity(theme.centerChannelColor, 0.64);

        return (
            <TouchableWithFeedback
                testID={actionTestID}
                disabled={disabled}
                onPress={this.handleButtonPress}
                style={style.icon}
                type={'opacity'}
            >
                <CompassIcon
                    color={color}
                    name='file-document-outline'
                    size={ICON_SIZE}
                />
            </TouchableWithFeedback>
        );
    }
}

const style = StyleSheet.create({
    icon: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
    },
});
