// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter} from 'react-native';

import CompassIcon from '@components/compass_icon';
import SlideUpPanelItem, {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import {Navigation} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {bottomSheet} from '@screens/navigation';
import PickerUtil from '@utils/file/file_picker';
import {changeOpacity} from '@utils/theme';

import type UserModel from '@typings/database/models/servers/user';
import type {ExtractedFileInfo} from '@typings/utils';

type ImagePickerProps = {
    browseFileType?: string;
    canBrowseFiles?: boolean;
    canBrowsePhotoLibrary?: boolean;
    canTakePhoto?: boolean;
    onRemoveProfileImage: () => void;
    uploadFiles: (files: ExtractedFileInfo[]) => void;
    user: UserModel;
};

const ImagePicker = ({
    browseFileType,
    canBrowseFiles = true,
    canBrowsePhotoLibrary = true,
    canTakePhoto = true,
    onRemoveProfileImage,
    uploadFiles,
    user,
}: ImagePickerProps) => {
    const intl = useIntl();
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const pictureUtils = useMemo(() => new PickerUtil(intl, uploadFiles), []);

    const showFileAttachmentOptions = useCallback(() => {
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
                        onPress: () => pictureUtils.attachFileFromPhotoGallery(),
                        testID: 'attachment.canBrowsePhotoLibrary',
                        text: intl.formatMessage({id: 'mobile.file_upload.library', defaultMessage: 'Photo Library'}),
                    },

                    //fixme: to use document picker library instead
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
                        destructive={Boolean(item?.isDestructive)}
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
    }, []);//fixme:  verify dependencies here

    return (
        <CompassIcon
            name='camera-outline'
            size={24}
            color={changeOpacity(theme.centerChannelColor, 0.6)}
            onPress={showFileAttachmentOptions}
        />
    );
};

export default ImagePicker;
