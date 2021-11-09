// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter, Platform, StyleSheet} from 'react-native';

import CompassIcon from '@components/compass_icon';
import ProfilePictureUtils from '@components/profile_picture/picker/utils';
import SlideUpPanelItem, {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {Navigation} from '@constants';
import {useServerUrl} from '@context/server_url';
import {useTheme} from '@context/theme';
import {bottomSheet} from '@screens/navigation';
import UserModel from '@typings/database/models/servers/user';
import {changeOpacity} from '@utils/theme';

import type {File} from '@typings/screens/edit_profile';

type ProfilePictureButtonProps = {
    browseFileType?: string;
    canBrowseFiles?: boolean;
    canBrowsePhotoLibrary?: boolean;
    canTakePhoto?: boolean;
    children?: React.ReactNode;
    user: UserModel;
    maxFileSize: number;
    onShowFileSizeWarning: (fileName: string) => void;
    onShowUnsupportedMimeTypeWarning: () => void;
    onRemoveProfileImage: () => void;
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

const ImagePicker = ({
    browseFileType,
    canBrowseFiles = true,
    canBrowsePhotoLibrary = true,
    canTakePhoto = true,
    children,
    maxFileSize,
    onRemoveProfileImage,
    onShowFileSizeWarning,
    onShowUnsupportedMimeTypeWarning,
    uploadFiles,
    user,
    wrapper,
}: ProfilePictureButtonProps) => {
    const intl = useIntl();
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const pictureUtils = useMemo(
        () =>
            new ProfilePictureUtils(
                intl,
                maxFileSize,
                onShowFileSizeWarning,
                onShowUnsupportedMimeTypeWarning,
                uploadFiles,
            ),
        [],
    );

    const showFileAttachmentOptions = () => {
        const canRemovePicture = pictureUtils.hasPictureUrl(user, serverUrl);

        const renderContent = () => {
            const renderPanelItems = (itemType: string) => {
                const types = {
                    takePhoto: {
                        icon: 'camera-outline',
                        onPress: () => pictureUtils.attachFileFromCamera(),
                        testID: 'attachment.canTakePhoto',
                        text: intl.formatMessage({id: 'mobile.file_upload.camera_photo', defaultMessage: 'Take Photo'}),
                    },
                    browsePhotoLibrary: {
                        icon: 'file-generic-outline',
                        onPress: () => pictureUtils.attachFileFromLibrary(),
                        testID: 'attachment.canBrowsePhotoLibrary',
                        text: intl.formatMessage({id: 'mobile.file_upload.library', defaultMessage: 'Photo Library'}),
                    },
                    browseFiles: {
                        icon: 'file-multiple-outline',
                        onPress: () => pictureUtils.attachFileFromFiles(intl, browseFileType),
                        testID: 'attachment.canBrowseFiles',
                        text: intl.formatMessage({id: 'mobile.file_upload.browse', defaultMessage: 'Browse Files'}),
                    },
                    removeProfilePicture: {
                        icon: 'trash-can-outline',
                        isDestructive: true,
                        onPress: () => {
                            DeviceEventEmitter.emit(Navigation.NAVIGATION_CLOSE_MODAL);
                            return onRemoveProfileImage();
                        },
                        testID: 'attachment.removeImage',
                        text: intl.formatMessage({id: 'mobile.edit_profile.remove_profile_photo', defaultMessage: 'Remove Photo'}),
                    },
                };

                //@ts-expect-error object string index
                const item = types[itemType];
                return (
                    <SlideUpPanelItem
                        icon={item.icon}
                        onPress={item.onPress}
                        testID={item.testID}
                        text={item.text}
                        destructive={item?.isDestructive}
                    />
                );
            };

            return (
                <>
                    {canTakePhoto && renderPanelItems('takePhoto')}
                    {canBrowsePhotoLibrary && renderPanelItems('browsePhotoLibrary')}
                    {canBrowseFiles && renderPanelItems('browseFiles')}
                    {canRemovePicture && renderPanelItems('removeProfilePicture')}
                </>
            );
        };

        return bottomSheet({
            closeButtonId: 'close-edit-profile',
            renderContent,
            snapPoints: [(5 * ITEM_HEIGHT) + 10, 10],
            title: '',
            theme,
        });
    };

    if (wrapper) {
        return (
            <TouchableWithFeedback
                onPress={showFileAttachmentOptions}
                type={'opacity'}
            >
                {children}
            </TouchableWithFeedback>
        );
    }

    return (
        <TouchableWithFeedback
            onPress={showFileAttachmentOptions}
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
};

export default ImagePicker;
