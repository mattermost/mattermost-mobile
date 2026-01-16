// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Alert, View} from 'react-native';
import {type CameraOptions} from 'react-native-image-picker';

import FormattedText from '@components/formatted_text';
import SlideUpPanelItem from '@components/slide_up_panel_item';
import {useTheme} from '@context/theme';
import {dismissBottomSheet} from '@screens/navigation';
import {fileMaxWarning, uploadDisabledWarning} from '@utils/file';
import PickerUtil from '@utils/file/file_picker';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    title: {
        color: theme.centerChannelColor,
        ...typography('Heading', 600, 'SemiBold'),
        marginBottom: 8,
    },
}));

type Props = {
    onUploadFiles: (files: ExtractedFileInfo[]) => void;
    maxFileCount?: number;
    fileCount?: number;
    maxFilesReached?: boolean;
    canUploadFiles?: boolean;
    testID?: string;
}

const AttachmentOptions: React.FC<Props> = ({
    onUploadFiles,
    maxFileCount,
    fileCount = 0,
    maxFilesReached = false,
    canUploadFiles = true,
    testID,
}) => {
    const theme = useTheme();
    const intl = useIntl();
    const styles = getStyleSheet(theme);

    const picker = useMemo(() => new PickerUtil(intl, onUploadFiles), [intl, onUploadFiles]);

    const checkCanUpload = () => {
        if (!canUploadFiles) {
            Alert.alert(
                intl.formatMessage({
                    id: 'mobile.link.error.title',
                    defaultMessage: 'Error',
                }),
                uploadDisabledWarning(intl),
            );
            return false;
        }
        return true;
    };

    const checkMaxFiles = () => {
        if (maxFilesReached && maxFileCount) {
            Alert.alert(
                intl.formatMessage({
                    id: 'mobile.link.error.title',
                    defaultMessage: 'Error',
                }),
                fileMaxWarning(intl, maxFileCount),
            );
            return true;
        }
        return false;
    };

    const onChooseFromPhotoLibrary = async () => {
        await dismissBottomSheet();
        if (!checkCanUpload() || checkMaxFiles()) {
            return;
        }
        const selectionLimit = maxFileCount ? maxFileCount - fileCount : undefined;
        picker.attachFileFromPhotoGallery(selectionLimit);
    };

    const onTakePhoto = async () => {
        await dismissBottomSheet();
        if (!checkCanUpload() || checkMaxFiles()) {
            return;
        }
        const options: CameraOptions = {
            quality: 0.8,
            mediaType: 'photo',
            saveToPhotos: true,
        };
        picker.attachFileFromCamera(options);
    };

    const onTakeVideo = async () => {
        await dismissBottomSheet();
        if (!checkCanUpload() || checkMaxFiles()) {
            return;
        }
        const options: CameraOptions = {
            quality: 0.8,
            videoQuality: 'high',
            mediaType: 'video',
            saveToPhotos: true,
        };
        picker.attachFileFromCamera(options);
    };

    const onAttachFile = async () => {
        await dismissBottomSheet();
        if (!checkCanUpload() || checkMaxFiles()) {
            return;
        }
        picker.attachFileFromFiles(undefined, true);
    };

    return (
        <View testID={testID}>
            <FormattedText
                id='mobile.file_attachment.title'
                defaultMessage='Files and media'
                style={styles.title}
            />
            <SlideUpPanelItem
                leftIcon='image-outline'
                onPress={onChooseFromPhotoLibrary}
                testID='file_attachment.photo_library'
                text={intl.formatMessage({id: 'mobile.file_upload.library', defaultMessage: 'Choose from photo library'})}
            />
            <SlideUpPanelItem
                leftIcon='camera-outline'
                onPress={onTakePhoto}
                testID='file_attachment.take_photo'
                text={intl.formatMessage({id: 'mobile.file_upload.camera_photo', defaultMessage: 'Take a photo'})}
            />
            <SlideUpPanelItem
                leftIcon='video-outline'
                onPress={onTakeVideo}
                testID='file_attachment.take_video'
                text={intl.formatMessage({id: 'mobile.file_upload.camera_video', defaultMessage: 'Take a video'})}
            />
            <SlideUpPanelItem
                leftIcon='paperclip'
                onPress={onAttachFile}
                testID='file_attachment.attach_file'
                text={intl.formatMessage({id: 'mobile.file_upload.browse', defaultMessage: 'Attach a file'})}
            />
        </View>
    );
};

export default AttachmentOptions;

