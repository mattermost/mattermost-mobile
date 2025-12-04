// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Alert, View} from 'react-native';
import {type CameraOptions} from 'react-native-image-picker';

import FormattedText from '@components/formatted_text';
import SlideUpPanelItem, {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import BottomSheet from '@screens/bottom_sheet';
import {dismissBottomSheet} from '@screens/navigation';
import {fileMaxWarning, uploadDisabledWarning} from '@utils/file';
import PickerUtil from '@utils/file/file_picker';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {AvailableScreens} from '@typings/screens/navigation';

const TITLE_HEIGHT = 54;
const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    title: {
        color: theme.centerChannelColor,
        ...typography('Heading', 600, 'SemiBold'),
        marginBottom: 8,
    },
}));

type Props = {
    componentId: AvailableScreens;
    closeButtonId?: string;
    onUploadFiles: (files: ExtractedFileInfo[]) => void;
    maxFileCount?: number;
    fileCount?: number;
    maxFilesReached?: boolean;
    canUploadFiles?: boolean;
    testID?: string;
}

const AttachmentOptions: React.FC<Props> = ({
    componentId,
    closeButtonId = 'attachment-close-id',
    onUploadFiles,
    maxFileCount,
    fileCount = 0,
    maxFilesReached = false,
    canUploadFiles = true,
    testID,
}) => {
    const theme = useTheme();
    const isTablet = useIsTablet();
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
        await dismissBottomSheet(Screens.ATTACHMENT_OPTIONS);
        if (!checkCanUpload() || checkMaxFiles()) {
            return;
        }
        const selectionLimit = maxFileCount ? maxFileCount - fileCount : undefined;
        picker.attachFileFromPhotoGallery(selectionLimit);
    };

    const onTakePhoto = async () => {
        await dismissBottomSheet(Screens.ATTACHMENT_OPTIONS);
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

    const onAttachFile = async () => {
        await dismissBottomSheet(Screens.ATTACHMENT_OPTIONS);
        if (!checkCanUpload() || checkMaxFiles()) {
            return;
        }
        picker.attachFileFromFiles(undefined, true);
    };

    const renderContent = () => {
        return (
            <View>
                {!isTablet &&
                <FormattedText
                    id='mobile.file_attachment.title'
                    defaultMessage='Files and media'
                    style={styles.title}
                />
                }
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
                    leftIcon='paperclip'
                    onPress={onAttachFile}
                    testID='file_attachment.attach_file'
                    text={intl.formatMessage({id: 'mobile.file_upload.browse', defaultMessage: 'Attach a file'})}
                />
            </View>
        );
    };

    const snapPoints = useMemo(() => {
        const componentHeight = TITLE_HEIGHT + bottomSheetSnapPoint(3, ITEM_HEIGHT);
        return [1, componentHeight];
    }, []);

    return (
        <BottomSheet
            componentId={componentId}
            renderContent={renderContent}
            closeButtonId={closeButtonId}
            snapPoints={snapPoints}
            testID={testID}
        />
    );
};

export default AttachmentOptions;

