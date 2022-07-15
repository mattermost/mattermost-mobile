// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {StyleSheet, TouchableWithoutFeedback, View} from 'react-native';
import Animated from 'react-native-reanimated';

import {updateDraftFile} from '@actions/local/draft';
import FileIcon from '@components/files/file_icon';
import ImageFile from '@components/files/image_file';
import ProgressBar from '@components/progress_bar';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useDidUpdate from '@hooks/did_update';
import {useGalleryItem} from '@hooks/gallery';
import DraftUploadManager from '@managers/draft_upload_manager';
import {isImage} from '@utils/file';
import {changeOpacity} from '@utils/theme';

import UploadRemove from './upload_remove';
import UploadRetry from './upload_retry';

type Props = {
    channelId: string;
    galleryIdentifier: string;
    index: number;
    file: FileInfo;
    openGallery: (file: FileInfo) => void;
    rootId: string;
}

const style = StyleSheet.create({
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
    channelId, galleryIdentifier, index, file,
    rootId, openGallery,
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

    const {styles, onGestureEvent, ref} = useGalleryItem(galleryIdentifier, index, handlePress);

    const filePreviewComponent = useMemo(() => {
        if (isImage(file)) {
            return (
                <ImageFile
                    file={file}
                    forwardRef={ref}
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
            style={style.preview}
        >
            <View style={style.previewContainer}>
                <TouchableWithoutFeedback onPress={onGestureEvent}>
                    <Animated.View style={[styles, style.filePreview]}>
                        {filePreviewComponent}
                    </Animated.View>
                </TouchableWithoutFeedback>
                {file.failed &&
                <UploadRetry
                    onPress={retryFileUpload}
                />
                }
                {loading && !file.failed &&
                <View style={style.progress}>
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

