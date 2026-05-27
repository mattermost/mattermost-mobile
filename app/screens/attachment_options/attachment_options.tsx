// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TurboLogger from '@mattermost/react-native-turbo-log';
import RNUtils from '@mattermost/rnutils';
import {File} from 'expo-file-system';
import React, {useMemo, useRef} from 'react';
import {useIntl} from 'react-intl';
import {Alert, View} from 'react-native';
import {type CameraOptions} from 'react-native-image-picker';

import FormattedText from '@components/formatted_text';
import SlideUpPanelItem from '@components/slide_up_panel_item';
import {useTheme} from '@context/theme';
import {dismissBottomSheet} from '@screens/navigation';
import {fileMaxWarning, pathWithPrefix, uploadDisabledWarning} from '@utils/file';
import PickerUtil from '@utils/file/file_picker';
import {generateId} from '@utils/general';
import {logError} from '@utils/log';
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
    showAttachLogs?: boolean;
    testID?: string;
}

const AttachmentOptions: React.FC<Props> = ({
    onUploadFiles,
    maxFileCount,
    fileCount = 0,
    maxFilesReached = false,
    canUploadFiles = true,
    showAttachLogs = false,
    testID,
}) => {
    const theme = useTheme();
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

    const onAttachLogs = async () => {
        if (attachingLogsRef.current) {
            return;
        }
        attachingLogsRef.current = true;
        try {
            await dismissBottomSheet();
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
            const zipFile = new File(zipUri);
            if (!zipFile.exists) {
                throw new Error('Zip file does not exist after creation');
            }
            const fileInfo: ExtractedFileInfo = {
                clientId: generateId(),
                name: `app-logs-${Date.now()}.zip`,
                mime_type: 'application/zip',
                extension: 'zip',
                size: zipFile.size,
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

export default AttachmentOptions;

