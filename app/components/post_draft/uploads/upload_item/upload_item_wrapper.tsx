// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {View} from 'react-native';

import {updateDraftFile} from '@actions/local/draft';
import UploadItemShared from '@components/upload_item_shared';
import {fileInfoToUploadItemFile} from '@components/upload_item_shared/adapters';
import {useEditPost} from '@context/edit_post';
import {useServerUrl} from '@context/server';
import useDidUpdate from '@hooks/did_update';
import {useGalleryItem} from '@hooks/gallery';
import DraftEditPostUploadManager from '@managers/draft_upload_manager';

import UploadRemove from './upload_remove';

type Props = {
    channelId: string;
    galleryIdentifier: string;
    index: number;
    file: FileInfo;
    openGallery: (file: FileInfo) => void;
    rootId: string;
    inViewPort?: boolean;
}

export default function UploadItemWrapper({
    channelId, galleryIdentifier, index, file,
    rootId, openGallery, inViewPort = true,
}: Props) {
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
            updateDraftFile(serverUrl, channelId, rootId, newFile);
            DraftEditPostUploadManager.prepareUpload(serverUrl, newFile, channelId, rootId, newFile.bytesRead);
        }

        DraftEditPostUploadManager.registerProgressHandler(newFile.clientId!, setProgress);
    }, [serverUrl, channelId, rootId, file, isEditMode, updateFileCallback]);

    const {styles, onGestureEvent, ref} = useGalleryItem(galleryIdentifier, index, handlePress);

    const uploadItemFile = fileInfoToUploadItemFile(file);

    return (
        <View
            key={file.clientId}
            style={{paddingTop: 5, marginLeft: 12}}
        >
            <UploadItemShared
                file={uploadItemFile}
                onPress={onGestureEvent}
                onRetry={retryFileUpload}
                loading={loading}
                progress={progress}
                showRetryButton={Boolean(file.failed)}
                galleryStyles={styles}
                testID={file.id}
                forwardRef={ref}
                inViewPort={inViewPort}
            />
            <UploadRemove
                clientId={file.clientId!}
                channelId={channelId}
                rootId={rootId}
                fileId={file.id!}
            />
        </View>
    );
}
