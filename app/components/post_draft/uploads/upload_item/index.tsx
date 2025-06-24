// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {TouchableWithoutFeedback, View, Text} from 'react-native';
import Animated from 'react-native-reanimated';

import {updateDraftFile} from '@actions/local/draft';
import FileIcon from '@components/files/file_icon';
import ImageFile from '@components/files/image_file';
import ProgressBar from '@components/progress_bar';
import {useEditPost} from '@context/edit_post';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useDidUpdate from '@hooks/did_update';
import {useGalleryItem} from '@hooks/gallery';
import DraftEditPostUploadManager from '@managers/draft_upload_manager';
import {isImage, getFormattedFileSize} from '@utils/file';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

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

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        preview: {
            paddingTop: 5,
            marginLeft: 12,
        },
        previewContainer: {
            borderRadius: 4,
            borderWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.16),
            backgroundColor: theme.centerChannelBg,
            alignItems: 'center',
        },
        imageOnlyContainer: {
            width: 64,
            height: 64,
            padding: 0,
        },
        fileWithInfoContainer: {
            width: 294,
            height: 64,
            flexDirection: 'row',
            alignItems: 'center',
            flexShrink: 0,
            gap: 16,
            paddingVertical: 12,
            paddingLeft: 12,
            paddingRight: 16,
        },
        iconContainer: {
            width: 48,
            height: 48,
            borderRadius: 4,
            marginRight: 8,
            justifyContent: 'center',
            alignItems: 'center',
        },
        imageContainer: {
            width: 64,
            height: 64,
            borderRadius: 4,
            marginRight: 8,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.16),
            shadowColor: '#000000',
            shadowOffset: {
                width: 0,
                height: 2,
            },
            shadowOpacity: 0.08,
            shadowRadius: 3,
            elevation: 1,
        },
        imageOnlyThumbnail: {
            width: 64,
            height: 64,
            borderRadius: 4,
            overflow: 'hidden',
            shadowColor: '#000000',
            shadowOffset: {
                width: 0,
                height: 2,
            },
            shadowOpacity: 0.08,
            shadowRadius: 3,
            elevation: 1,
        },
        fileInfo: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'flex-start',
        },
        fileName: {
            color: theme.centerChannelColor,
            ...typography('Body', 200, 'SemiBold'),
            marginBottom: 2,
        },
        fileSize: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 75, 'Regular'),
        },
        progress: {
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            borderRadius: 4,
            justifyContent: 'flex-end',
            paddingLeft: 3,
        },
        progressContainer: {
            paddingVertical: undefined,
            position: undefined,
            justifyContent: undefined,
        },
    };
});

export default function UploadItem({
    channelId, galleryIdentifier, index, file,
    rootId, openGallery,
}: Props) {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const serverUrl = useServerUrl();
    const removeCallback = useRef<(() => void) | undefined>(undefined);
    const [progress, setProgress] = useState(0);
    const {updateFileCallback, isEditMode} = useEditPost();

    const loading = DraftEditPostUploadManager.isUploading(file.clientId!);

    const handlePress = useCallback(() => {
        openGallery(file);
    }, [openGallery, file]);

    useEffect(() => {
        if (file.clientId) {
            removeCallback.current = DraftEditPostUploadManager.registerProgressHandler(file.clientId, setProgress);
        }
        return () => {
            removeCallback.current?.();
            removeCallback.current = undefined;
        };
    }, []);

    useDidUpdate(() => {
        if (loading && file.clientId) {
            removeCallback.current = DraftEditPostUploadManager.registerProgressHandler(file.clientId, setProgress);
        }
        return () => {
            removeCallback.current?.();
            removeCallback.current = undefined;
        };
    }, [file.failed, file.id]);

    const retryFileUpload = useCallback(() => {
        if (!file.failed) {
            return;
        }

        const newFile = {...file};
        newFile.failed = false;

        if (isEditMode && updateFileCallback) {
            // In edit mode, use the context callback to update the file
            updateFileCallback(newFile);
            DraftEditPostUploadManager.prepareUpload(
                serverUrl,
                newFile,
                channelId,
                rootId,
                newFile.bytesRead,
                true, // isEditPost = true
                updateFileCallback,
            );
        } else {
            // In draft mode, use the draft file system
            updateDraftFile(serverUrl, channelId, rootId, newFile);
            DraftEditPostUploadManager.prepareUpload(serverUrl, newFile, channelId, rootId, newFile.bytesRead);
        }

        DraftEditPostUploadManager.registerProgressHandler(newFile.clientId!, setProgress);
    }, [serverUrl, channelId, rootId, file, isEditMode, updateFileCallback]);

    const {styles, onGestureEvent, ref} = useGalleryItem(galleryIdentifier, index, handlePress);

    const fileDisplayComponent = useMemo(() => {
        if (isImage(file)) {
            return (
                <View style={style.imageOnlyThumbnail}>
                    <ImageFile
                        file={file}
                        forwardRef={ref}
                        contentFit='cover'
                        inViewPort={true}
                    />
                </View>
            );
        }
        return (
            <View style={style.iconContainer}>
                <FileIcon
                    backgroundColor={changeOpacity(theme.centerChannelColor, 0.08)}
                    iconSize={48}
                    file={file}
                    testID={file.id}
                />
            </View>
        );
    }, [file, ref, theme.centerChannelColor, style.imageOnlyThumbnail, style.iconContainer]);

    const fileExtension = useMemo(() => {
        return file.extension?.toUpperCase() || file.name?.split('.').pop()?.toUpperCase() || '';
    }, [file.extension, file.name]);

    const formattedSize = useMemo(() => {
        return getFormattedFileSize(file.size || 0);
    }, [file.size]);

    const fileName = useMemo(() => {
        return file.name || 'Unknown file';
    }, [file.name]);

    const isImageFile = isImage(file);
    const containerStyle = [
        style.previewContainer,
        isImageFile ? style.imageOnlyContainer : style.fileWithInfoContainer,
    ];

    return (
        <View
            key={file.clientId}
            style={style.preview}
        >
            <View style={containerStyle}>
                <TouchableWithoutFeedback onPress={onGestureEvent}>
                    <Animated.View style={styles}>
                        {fileDisplayComponent}
                    </Animated.View>
                </TouchableWithoutFeedback>

                {!isImageFile && (
                    <View style={style.fileInfo}>
                        <Text
                            style={style.fileName}
                            numberOfLines={1}
                            ellipsizeMode='tail'
                        >
                            {fileName}
                        </Text>
                        <Text style={style.fileSize}>
                            {fileExtension && `${fileExtension} `}{formattedSize}
                        </Text>
                    </View>
                )}

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
                        containerStyle={style.progressContainer}
                    />
                </View>
                }
            </View>
            <UploadRemove
                clientId={file.clientId!}
                channelId={channelId}
                rootId={rootId}
                fileId={file.id!}
            />
        </View>
    );
}

