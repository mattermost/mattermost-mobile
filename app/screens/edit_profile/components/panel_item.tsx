// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {type MessageDescriptor, useIntl} from 'react-intl';
import DocumentPicker from 'react-native-document-picker';

import SlideUpPanelItem from '@components/slide_up_panel_item';
import {dismissBottomSheet} from '@screens/navigation';

import type PickerUtil from '@utils/file/file_picker';
import type {Source} from 'react-native-fast-image';

type PanelType = {
    icon: string | Source;
    onPress: () => Promise<void> | void;
    testID: string;
    text: MessageDescriptor;
    isDestructive?: boolean;
}

type PanelItemProps = {
    onRemoveProfileImage?: UploadExtractedFile;
    pickerAction: 'takePhoto' | 'browsePhotoLibrary' | 'browseFiles' | 'removeProfilePicture';
    pictureUtils?: PickerUtil;
};

const PanelItem = ({pickerAction, pictureUtils, onRemoveProfileImage}: PanelItemProps) => {
    const intl = useIntl();

    const panelTypes = useMemo(() => ({
        takePhoto: {
            icon: 'camera-outline',
            onPress: async () => {
                await dismissBottomSheet();
                pictureUtils?.attachFileFromCamera();
            },
            testID: 'attachment.takePhoto',
            text: {id: 'mobile.file_upload.camera_photo', defaultMessage: 'Take Photo'},
        },
        browsePhotoLibrary: {
            icon: 'file-generic-outline',
            onPress: async () => {
                await dismissBottomSheet();
                pictureUtils?.attachFileFromPhotoGallery();
            },
            testID: 'attachment.browsePhotoLibrary',
            text: {id: 'mobile.file_upload.library', defaultMessage: 'Photo Library'},
        },
        browseFiles: {
            icon: 'file-multiple-outline',
            onPress: async () => {
                await dismissBottomSheet();
                pictureUtils?.attachFileFromFiles(DocumentPicker.types.images);
            },
            testID: 'attachment.browseFiles',
            text: {id: 'mobile.file_upload.browse', defaultMessage: 'Browse Files'},
        },
        removeProfilePicture: {
            icon: 'trash-can-outline',
            onPress: async () => {
                await dismissBottomSheet();
                return onRemoveProfileImage && onRemoveProfileImage();
            },
            testID: 'attachment.removeImage',
            text: {id: 'mobile.edit_profile.remove_profile_photo', defaultMessage: 'Remove Photo'},
        },
    }), [pictureUtils, onRemoveProfileImage]);

    const item: PanelType = panelTypes[pickerAction];

    return (
        <SlideUpPanelItem
            leftIcon={item.icon}
            onPress={item.onPress}
            testID={item.testID}
            text={intl.formatMessage(item.text)}
            destructive={pickerAction === 'removeProfilePicture'}
        />
    );
};

export default PanelItem;
