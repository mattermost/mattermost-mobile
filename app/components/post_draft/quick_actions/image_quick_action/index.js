// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {Alert, Platform, StatusBar, StyleSheet} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import ImagePicker from 'react-native-image-picker';
import Permissions from 'react-native-permissions';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {NavigationTypes} from '@constants';
import EventEmitter from '@mm-redux/utils/event_emitter';
import {ICON_SIZE, MAX_FILE_COUNT_WARNING} from '@constants/post_draft';
import {changeOpacity} from '@utils/theme';

export default class ImageQuickAction extends PureComponent {
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

    attachFileFromLibrary = async () => {
        const {formatMessage} = this.context.intl;
        const {title, text} = this.getPermissionDeniedMessage();
        const options = {
            quality: 0.8,
            mediaType: 'mixed',
            noData: true,
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

        const hasPhotoPermission = await this.hasPhotoPermission();

        if (hasPhotoPermission) {
            ImagePicker.launchImageLibrary(options, (response) => {
                StatusBar.setHidden(false);
                if (response.error || response.didCancel) {
                    return;
                }

                this.props.onUploadFiles([response]);
            });
        }
    };

    getPermissionDeniedMessage = () => {
        const {formatMessage} = this.context.intl;
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
        this.attachFileFromLibrary();
    };

    hasPhotoPermission = async () => {
        const {formatMessage} = this.context.intl;
        const targetSource = Platform.OS === 'ios' ?
            Permissions.PERMISSIONS.IOS.PHOTO_LIBRARY :
            Permissions.PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;
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

        return true;
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
                    name='image-outline'
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
