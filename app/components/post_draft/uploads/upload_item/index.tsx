// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';

import {useTheme} from '@app/context/theme';
import FileIcon from '@components//post_list/post/body/files/file_icon';
import ImageFile from '@components/post_list/post/body/files/image_file';
import ProgressBar from '@components/progress_bar';
import {isImage} from '@utils/file';
import {changeOpacity} from '@utils/theme';

import UploadRemove from './upload_remove';
import UploadRetry from './upload_retry';

type Props = {
    file: FileInfo;
    removeFile: (file: FileInfo) => void;
    openGallery: (file: FileInfo) => void;
    retryFileUpload: (file: FileInfo) => void;
}

export default function UploadItem({
    file,
    removeFile,
    openGallery,
    retryFileUpload,
}: Props) {
    const theme = useTheme();

    const handlePress = useCallback(() => {
        openGallery(file);
    }, [openGallery, file]);

    const handleRetryFileUpload = useCallback(() => {
        if (!file.failed) {
            return;
        }

        retryFileUpload(file);
    }, [retryFileUpload, file]);

    const handleRemoveFile = useCallback(() => {
        removeFile(file);
    }, [removeFile, file]);

    let filePreviewComponent;

    if (isImage(file)) {
        filePreviewComponent = (
            <TouchableOpacity onPress={handlePress}>
                <View style={styles.filePreview}>
                    <ImageFile
                        file={file}
                        resizeMode='cover'
                    />
                </View>
            </TouchableOpacity>
        );
    } else {
        filePreviewComponent = (
            <TouchableOpacity onPress={handlePress}>
                <View style={styles.filePreview}>
                    <FileIcon
                        backgroundColor={changeOpacity(theme.centerChannelColor, 0.08)}
                        iconSize={60}
                        file={file}
                    />
                </View>
            </TouchableOpacity>
        );
    }

    return (
        <View
            key={file.clientId}
            style={styles.preview}
        >
            <View style={styles.previewContainer}>
                {filePreviewComponent}
                {file.failed &&
                <UploadRetry
                    onPress={handleRetryFileUpload}
                />
                }
                {file.loading && !file.failed &&
                <View style={styles.progress}>
                    <ProgressBar
                        progress={file.progress || 0}
                        color={theme.buttonBg}
                    />
                </View>
                }
            </View>
            <UploadRemove
                onPress={handleRemoveFile}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    preview: {
        paddingTop: 5,
        marginLeft: 12,
    },
    previewContainer: {
        height: 56,
        width: 56,
        borderRadius: 4,
    },
    progress: {
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        height: 53,
        width: 53,
        justifyContent: 'flex-end',
        position: 'absolute',
        borderRadius: 4,
        paddingLeft: 3,
    },
    filePreview: {
        width: 56,
        height: 56,
    },
});
