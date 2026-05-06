// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef} from 'react';
import {useIntl} from 'react-intl';

import {addFilesToDraft, removeDraft} from '@actions/local/draft';
import {useServerUrl} from '@context/server';
import useFileUploadError from '@hooks/file_upload_error';
import DraftEditPostUploadManager from '@managers/draft_upload_manager';
import {getResizeImages, getResizeImagesMaxDimension} from '@queries/app/global';
import {fileMaxWarning, fileSizeWarning, getUploadErrorMessage, resizeImageIfNeeded, uploadDisabledWarning} from '@utils/file';

import SendHandler from '../send_handler';

import type {ErrorHandlers} from '@typings/components/upload_error_handlers';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    testID?: string;
    channelId: string;
    cursorPosition: number;
    rootId?: string;
    canShowPostPriority?: boolean;
    files?: FileInfo[];
    maxFileCount: number;
    maxFileSize: number;
    canUploadFiles: boolean;
    updateCursorPosition: React.Dispatch<React.SetStateAction<number>>;
    updatePostInputTop: (top: number) => void;
    updateValue: React.Dispatch<React.SetStateAction<string>>;
    value: string;
    setIsFocused: (isFocused: boolean) => void;
    onPostCreated?: (postId: string) => void;
    location?: AvailableScreens;
}

const emptyFileList: FileInfo[] = [];

export default function DraftHandler(props: Props) {
    const {
        testID,
        channelId,
        cursorPosition,
        rootId = '',
        canShowPostPriority,
        files,
        maxFileCount,
        maxFileSize,
        canUploadFiles,
        updateCursorPosition,
        updatePostInputTop,
        updateValue,
        value,
        setIsFocused,
        onPostCreated,
        location,
    } = props;

    const serverUrl = useServerUrl();
    const intl = useIntl();

    const uploadErrorHandlers = useRef<ErrorHandlers>({});
    const {uploadError, newUploadError} = useFileUploadError();

    const handleUploadError = useCallback((errorMessage: string, errorName?: string) => {
        newUploadError(getUploadErrorMessage(intl, errorMessage, errorName));
    }, [intl, newUploadError]);

    const clearDraft = useCallback(() => {
        removeDraft(serverUrl, channelId, rootId);
        updateValue('');
    }, [serverUrl, channelId, rootId, updateValue]);

    const addFiles = useCallback(async (newFiles: FileInfo[]) => {
        if (!newFiles.length) {
            return;
        }

        if (!canUploadFiles) {
            newUploadError(uploadDisabledWarning(intl));
            return;
        }

        const resizeEnabled = await getResizeImages();
        let filesToUpload = newFiles;
        if (resizeEnabled) {
            const maxDim = await getResizeImagesMaxDimension();
            filesToUpload = await Promise.all(newFiles.map((f) => resizeImageIfNeeded(f, maxDim)));
        }

        const currentFileCount = files?.length || 0;
        const availableCount = maxFileCount - currentFileCount;
        if (filesToUpload.length > availableCount) {
            newUploadError(fileMaxWarning(intl, maxFileCount));
            return;
        }

        const largeFile = filesToUpload.find((file) => file.size > maxFileSize);
        if (largeFile) {
            newUploadError(fileSizeWarning(intl, maxFileSize));
            return;
        }

        addFilesToDraft(serverUrl, channelId, rootId, filesToUpload);

        for (const file of filesToUpload) {
            DraftEditPostUploadManager.prepareUpload(serverUrl, file, channelId, rootId);
            uploadErrorHandlers.current[file.clientId!] = DraftEditPostUploadManager.registerErrorHandler(file.clientId!, handleUploadError);
        }

        newUploadError(null);
    }, [intl, newUploadError, maxFileSize, serverUrl, files?.length, channelId, rootId, canUploadFiles, maxFileCount, handleUploadError]);

    // This effect mainly handles keeping clean the uploadErrorHandlers, and
    // reinstantiate them on component mount and file retry.
    useEffect(() => {
        let loadingFiles: FileInfo[] = [];
        if (files) {
            loadingFiles = files.filter((v) => v.clientId && DraftEditPostUploadManager.isUploading(v.clientId));
        }

        for (const key of Object.keys(uploadErrorHandlers.current)) {
            if (!loadingFiles.find((v) => v.clientId === key)) {
                uploadErrorHandlers.current[key]?.();
                delete (uploadErrorHandlers.current[key]);
            }
        }

        for (const file of loadingFiles) {
            if (!uploadErrorHandlers.current[file.clientId!]) {
                uploadErrorHandlers.current[file.clientId!] = DraftEditPostUploadManager.registerErrorHandler(file.clientId!, handleUploadError);
            }
        }
    }, [files, newUploadError, handleUploadError]);

    return (
        <SendHandler
            testID={testID}
            channelId={channelId}
            rootId={rootId}
            canShowPostPriority={canShowPostPriority}

            // From draft handler
            cursorPosition={cursorPosition}
            value={value}
            files={files || emptyFileList}
            clearDraft={clearDraft}
            addFiles={addFiles}
            uploadFileError={uploadError}
            updateCursorPosition={updateCursorPosition}
            updatePostInputTop={updatePostInputTop}
            updateValue={updateValue}
            setIsFocused={setIsFocused}
            onPostCreated={onPostCreated}
            location={location}
        />
    );
}
