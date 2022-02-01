// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';

import {updateDraftFile} from '@actions/local/draft';
import FileIcon from '@components/post_list/post/body/files/file_icon';
import ImageFile from '@components/post_list/post/body/files/image_file';
import ProgressBar from '@components/progress_bar';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useDidUpdate from '@hooks/did_update';
import DraftUploadManager from '@init/draft_upload_manager';
import {isImage} from '@utils/file';
import {changeOpacity} from '@utils/theme';

import UploadRemove from './upload_remove';
import UploadRetry from './upload_retry';

type Props = {
    file: FileInfo;
    channelId: string;
    rootId: string;
    openGallery: (file: FileInfo) => void;
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

export default function UploadItem({
    file,
    channelId,
    rootId,
    openGallery,
}: Props) {
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const removeCallback = useRef<(() => void)|null>(null);
    const [progress, setProgress] = useState(0);

    const loading = DraftUploadManager.isUploading(file.clientId!);

    const handlePress = useCallback(() => {
        openGallery(file);
    }, [openGallery, file]);

    useEffect(() => {
        if (file.clientId) {
            removeCallback.current = DraftUploadManager.registerProgressHandler(file.clientId, setProgress);
        }
        return () => {
            removeCallback.current?.();
            removeCallback.current = null;
        };
    }, []);

    useDidUpdate(() => {
        if (loading && file.clientId) {
            removeCallback.current = DraftUploadManager.registerProgressHandler(file.clientId, setProgress);
        }
        return () => {
            removeCallback.current?.();
            removeCallback.current = null;
        };
    }, [file.failed, file.id]);

    const retryFileUpload = useCallback(() => {
        if (!file.failed) {
            return;
        }

        const newFile = {...file};
        newFile.failed = false;

        updateDraftFile(serverUrl, channelId, rootId, newFile);
        DraftUploadManager.prepareUpload(serverUrl, newFile, channelId, rootId, newFile.bytesRead);
        DraftUploadManager.registerProgressHandler(newFile.clientId!, setProgress);
    }, [serverUrl, channelId, rootId, file]);

    const filePreviewComponent = useMemo(() => {
        if (isImage(file)) {
            return (
                <ImageFile
                    file={file}
                    resizeMode='cover'
                />
            );
        }
        return (
            <FileIcon
                backgroundColor={changeOpacity(theme.centerChannelColor, 0.08)}
                iconSize={60}
                file={file}
            />
        );
    }, [file]);

    return (
        <View
            key={file.clientId}
            style={styles.preview}
        >
            <View style={styles.previewContainer}>
                <TouchableOpacity onPress={handlePress}>
                    <View style={styles.filePreview}>
                        {filePreviewComponent}
                    </View>
                </TouchableOpacity>
                {file.failed &&
                <UploadRetry
                    onPress={retryFileUpload}
                />
                }
                {loading && !file.failed &&
                <View style={styles.progress}>
                    <ProgressBar
                        progress={progress || 0}
                        color={theme.buttonBg}
                    />
                </View>
                }
            </View>
            <UploadRemove
                clientId={file.clientId!}
                channelId={channelId}
                rootId={rootId}
            />
        </View>
    );
}

