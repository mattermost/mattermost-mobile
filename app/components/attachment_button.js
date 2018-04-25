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
import Icon from 'react-native-vector-icons/Ionicons';
import {DocumentPicker} from 'react-native-document-picker';
import ImagePicker from 'react-native-image-picker';
import Permissions from 'react-native-permissions';

import {PermissionTypes} from 'app/constants';
import {changeOpacity} from 'app/utils/theme';

const ShareExtension = NativeModules.MattermostShare;

export default class AttachmentButton extends PureComponent {
    static propTypes = {
        blurTextBox: PropTypes.func.isRequired,
        children: PropTypes.node,
        fileCount: PropTypes.number,
        maxFileCount: PropTypes.number.isRequired,
        navigator: PropTypes.object.isRequired,
        onShowFileMaxWarning: PropTypes.func,
        theme: PropTypes.object.isRequired,
        uploadFiles: PropTypes.func.isRequired,
        wrapper: PropTypes.bool,
    };

    static defaultProps = {
        maxFileCount: 5,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    attachFileFromCamera = async () => {
        const {formatMessage} = this.context.intl;
        const options = {
            quality: 1.0,
            noData: true,
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

        const hasPhotoPermission = await this.hasPhotoPermission();

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
            quality: 1.0,
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

    attachVideoFromLibraryAndroid = () => {
        const {formatMessage} = this.context.intl;
        const options = {
            quality: 1.0,
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
        const hasPermission = await this.hasStoragePermission();

        if (hasPermission) {
            DocumentPicker.show({
                filetype: [Platform.OS === 'ios' ? 'public.item' : '*/*'],
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

                this.uploadFiles([res]);
            });
        }
    };

    hasPhotoPermission = async () => {
        if (Platform.OS === 'ios') {
            const {formatMessage} = this.context.intl;
            let permissionRequest;
            const hasPermissionToStorage = await Permissions.check('photo');

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

    uploadFiles = (images) => {
        this.props.uploadFiles(images);
    };

    handleFileAttachmentOption = (action) => {
        this.props.navigator.dismissModal({
            animationType: 'none',
        });

        // Have to wait to launch the library attachment action.
        // If we call the action after dismissModal with no delay then the
        // Wix navigator will dismiss the library attachment modal as well.
        setTimeout(() => {
            if (typeof action === 'function') {
                action();
            }
        }, 100);
    };

    showFileAttachmentOptions = () => {
        const {fileCount, maxFileCount, onShowFileMaxWarning} = this.props;

        if (fileCount === maxFileCount) {
            onShowFileMaxWarning();
            return;
        }

        this.props.blurTextBox();
        const options = {
            items: [{
                action: () => this.handleFileAttachmentOption(this.attachFileFromCamera),
                text: {
                    id: 'mobile.file_upload.camera',
                    defaultMessage: 'Take Photo or Video',
                },
                icon: 'camera',
            }, {
                action: () => this.handleFileAttachmentOption(this.attachFileFromLibrary),
                text: {
                    id: 'mobile.file_upload.library',
                    defaultMessage: 'Photo Library',
                },
                icon: 'photo',
            }],
        };

        if (Platform.OS === 'android') {
            options.items.push({
                action: () => this.handleFileAttachmentOption(this.attachVideoFromLibraryAndroid),
                text: {
                    id: 'mobile.file_upload.video',
                    defaultMessage: 'Video Library',
                },
                icon: 'file-video-o',
            });
        }

        options.items.push({
            action: () => this.handleFileAttachmentOption(this.attachFileFromFiles),
            text: {
                id: 'mobile.file_upload.browse',
                defaultMessage: 'Browse Files',
            },
            icon: 'file',
        });

        this.props.navigator.showModal({
            screen: 'OptionsModal',
            title: '',
            animationType: 'none',
            passProps: {
                items: options.items,
            },
            navigatorStyle: {
                navBarHidden: true,
                statusBarHidden: false,
                statusBarHideWithNavBar: false,
                screenBackgroundColor: 'transparent',
                modalPresentationStyle: 'overCurrentContext',
            },
        });
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

