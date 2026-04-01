// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TurboLogger from '@mattermost/react-native-turbo-log';
import RNUtils from '@mattermost/rnutils';
import {getInfoAsync} from 'expo-file-system';
import React, {useMemo, useRef} from 'react';
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
import {fileMaxWarning, pathWithPrefix, uploadDisabledWarning} from '@utils/file';
import PickerUtil from '@utils/file/file_picker';
import {generateId} from '@utils/general';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {logError} from '@utils/log';
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
    showAttachLogs?: boolean;
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
    showAttachLogs = false,
    testID,
}) => {
    const theme = useTheme();
    const isTablet = useIsTablet();
    const intl = useIntl();
    const styles = getStyleSheet(theme);
    const attachingLogsRef = useRef(false);

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

    const onTakeVideo = async () => {
        await dismissBottomSheet(Screens.ATTACHMENT_OPTIONS);
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
        await dismissBottomSheet(Screens.ATTACHMENT_OPTIONS);
        if (!checkCanUpload() || checkMaxFiles()) {
            return;
        }
        picker.attachFileFromFiles(undefined, true);
    };

    const onAttachLogs = async () => {
        if (attachingLogsRef.current) {
            return;
        }
        attachingLogsRef.current = true;
        try {
            await dismissBottomSheet(Screens.ATTACHMENT_OPTIONS);
            if (!checkCanUpload() || checkMaxFiles()) {
                return;
            }
            const logPaths = await TurboLogger.getLogPaths();
            if (!logPaths.length) {
                Alert.alert(
                    intl.formatMessage({id: 'mobile.link.error.title', defaultMessage: 'Error'}),
                    intl.formatMessage({id: 'screen.report_problem.logs.no_logs', defaultMessage: 'No log files available'}),
                );
                return;
            }

            const zipFilePath = await RNUtils.createZipFile(logPaths);
            if (!zipFilePath) {
                throw new Error('createZipFile returned empty path');
            }
            const zipUri = pathWithPrefix('file://', zipFilePath);
            const fileInfoResult = await getInfoAsync(zipUri, {size: true});
            if (!fileInfoResult.exists) {
                throw new Error('Zip file does not exist after creation');
            }
            const fileInfo: ExtractedFileInfo = {
                clientId: generateId(),
                name: `app-logs-${Date.now()}.zip`,
                mime_type: 'application/zip',
                extension: 'zip',
                size: fileInfoResult.size,
                localPath: zipUri,
            };
            onUploadFiles([fileInfo]);
        } catch (error) {
            logError('[AttachmentOptions.onAttachLogs]', error);
            Alert.alert(
                intl.formatMessage({id: 'mobile.link.error.title', defaultMessage: 'Error'}),
                intl.formatMessage({id: 'mobile.file_upload.attach_logs_failed', defaultMessage: 'Failed to attach app logs'}),
            );
        } finally {
            attachingLogsRef.current = false;
        }
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
                {showAttachLogs && (
                    <SlideUpPanelItem
                        leftIcon='file-text-outline'
                        onPress={onAttachLogs}
                        testID='file_attachment.attach_logs'
                        text={intl.formatMessage({
                            id: 'mobile.file_upload.attach_logs',
                            defaultMessage: 'Attach app logs',
                        })}
                    />
                )}
            </View>
        );
    };

    const snapPoints = useMemo(() => {
        const itemCount = showAttachLogs ? 5 : 4;
        const componentHeight = TITLE_HEIGHT + bottomSheetSnapPoint(itemCount, ITEM_HEIGHT);
        return [1, componentHeight];
    }, [showAttachLogs]);

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

