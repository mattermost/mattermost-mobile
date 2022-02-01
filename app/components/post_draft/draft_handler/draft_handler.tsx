// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';

import {addFilesToDraft, removeDraft} from '@actions/local/draft';
import {useServerUrl} from '@context/server';
import DraftUploadManager from '@init/draft_upload_manager';
import {fileMaxWarning, fileSizeWarning, uploadDisabledWarning} from '@utils/file';

import SendHandler from '../send_handler';

type Props = {
    testID?: string;
    channelId: string;
    rootId?: string;
    files?: FileInfo[];
    message?: string;
    maxFileSize: number;
    maxFileCount: number;
    canUploadFiles: boolean;
}

const emptyFileList: FileInfo[] = [];
const UPLOAD_ERROR_SHOW_INTERVAL = 5000;

type ErrorHandlers = {
    [clientId: string]: (() => void) | null;
}

export default function DraftHandler(props: Props) {
    const {
        testID,
        channelId,
        rootId = '',
        files,
        message,
        maxFileSize,
        maxFileCount,
        canUploadFiles,
    } = props;

    const serverUrl = useServerUrl();
    const intl = useIntl();

    const [currentValue, setCurrentValue] = useState(message || '');
    const [uploadError, setUploadError] = useState<React.ReactNode>(null);

    const uploadErrorTimeout = useRef<NodeJS.Timeout>();
    const uploadErrorHandlers = useRef<ErrorHandlers>({});

    const clearDraft = useCallback(() => {
        removeDraft(serverUrl, channelId, rootId);
        setCurrentValue('');
    }, [serverUrl, channelId, rootId]);

    const newUploadError = useCallback((error: React.ReactNode) => {
        if (uploadErrorTimeout.current) {
            clearTimeout(uploadErrorTimeout.current);
        }
        setUploadError(error);

        uploadErrorTimeout.current = setTimeout(() => {
            setUploadError(null);
        }, UPLOAD_ERROR_SHOW_INTERVAL);
    }, []);

    const addFiles = useCallback((newFiles: FileInfo[]) => {
        if (!newFiles.length) {
            return;
        }

        if (!canUploadFiles) {
            newUploadError(uploadDisabledWarning(intl));
            return;
        }

        const currentFileCount = files?.length || 0;
        const availableCount = maxFileCount - currentFileCount;
        if (newFiles.length > availableCount) {
            newUploadError(fileMaxWarning(intl, maxFileCount));
            return;
        }

        const largeFile = newFiles.find((file) => file.size > maxFileSize);
        if (largeFile) {
            newUploadError(fileSizeWarning(intl, maxFileSize));
            return;
        }

        addFilesToDraft(serverUrl, channelId, rootId, newFiles);

        for (const file of newFiles) {
            DraftUploadManager.prepareUpload(serverUrl, file, channelId, rootId);
            uploadErrorHandlers.current[file.clientId!] = DraftUploadManager.registerErrorHandler(file.clientId!, newUploadError);
        }

        newUploadError(null);
    }, [intl, newUploadError, maxFileCount, maxFileSize, serverUrl, files?.length, channelId, rootId]);

    // This effect mainly handles keeping clean the uploadErrorHandlers, and
    // reinstantiate them on component mount and file retry.
    useEffect(() => {
        let loadingFiles: FileInfo[] = [];
        if (files) {
            loadingFiles = files.filter((v) => v.clientId && DraftUploadManager.isUploading(v.clientId));
        }

        for (const key of Object.keys(uploadErrorHandlers.current)) {
            if (!loadingFiles.find((v) => v.clientId === key)) {
                uploadErrorHandlers.current[key]?.();
                delete (uploadErrorHandlers.current[key]);
            }
        }

        for (const file of loadingFiles) {
            if (!uploadErrorHandlers.current[file.clientId!]) {
                uploadErrorHandlers.current[file.clientId!] = DraftUploadManager.registerErrorHandler(file.clientId!, newUploadError);
            }
        }
    }, [files]);

    return (
        <SendHandler
            testID={testID}
            channelId={channelId}
            rootId={rootId}

            // From draft handler
            value={currentValue}
            files={files || emptyFileList}
            clearDraft={clearDraft}
            updateValue={setCurrentValue}
            addFiles={addFiles}
            uploadFileError={uploadError}
        />
    );
}
