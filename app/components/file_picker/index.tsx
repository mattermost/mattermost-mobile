// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter} from 'react-native';

import SlideUpPanelItem, {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {Navigation} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {bottomSheet} from '@screens/navigation';
import PickerUtil from '@utils/file/picker_util';

import type {File} from '@typings/screens/edit_profile';

type ProfilePictureButtonProps = {
    browseFileType?: string;
    canBrowseFiles?: boolean;
    canBrowsePhotoLibrary?: boolean;
    canTakePhoto?: boolean;
    children?: React.ReactNode;
    lastPictureUpdate: number;
    maxFileSize: number;
    onRemoveProfileImage: () => void;
    onShowFileSizeWarning: (fileName: string) => void;
    onShowUnsupportedMimeTypeWarning: () => void;
    uploadFiles: (files: File[]) => void;
    userId: string;
};

const ImagePicker = ({
    browseFileType,
    canBrowseFiles = true,
    canBrowsePhotoLibrary = true,
    canTakePhoto = true,
    children,
    lastPictureUpdate,
    maxFileSize,
    onRemoveProfileImage,
    onShowFileSizeWarning,
    onShowUnsupportedMimeTypeWarning,
    uploadFiles,
    userId,
}: ProfilePictureButtonProps) => {
    const intl = useIntl();
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const pictureUtils = useMemo(
        () =>
            new PickerUtil(
                intl,
                maxFileSize,
                onShowFileSizeWarning,
                onShowUnsupportedMimeTypeWarning,
                uploadFiles,
            ),
        [],
    );

    const showFileAttachmentOptions = () => {
        const canRemovePicture = pictureUtils.hasPictureUrl(userId, lastPictureUpdate, serverUrl);

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
                        onPress: () => pictureUtils.attachFileFromPhotoGallery(),
                        testID: 'attachment.canBrowsePhotoLibrary',
                        text: intl.formatMessage({id: 'mobile.file_upload.library', defaultMessage: 'Photo Library'}),
                    },
                    browseFiles: {
                        icon: 'file-multiple-outline',
                        onPress: () => pictureUtils.attachFileFromFiles(browseFileType),
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

        const snapPoints = canRemovePicture ? 5 : 4;

        return bottomSheet({
            closeButtonId: 'close-edit-profile',
            renderContent,
            snapPoints: [(snapPoints * ITEM_HEIGHT), 10],
            title: '',
            theme,
        });
    };

    return (
        <TouchableWithFeedback
            onPress={showFileAttachmentOptions}
            type={'opacity'}
        >
            {children}
        </TouchableWithFeedback>
    );
};

export default ImagePicker;
