// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ClientResponse, ClientResponseError} from '@mattermost/react-native-network-client';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {IntlShape, useIntl} from 'react-intl';

import {removeDraft, updateDraft} from '@actions/local/post';
import {uploadFile} from '@actions/remote/file';
import {useServerUrl} from '@app/context/server_url';
import {DraftModel} from '@app/database/models/server';
import {getFormattedFileSize} from '@app/utils/file';

import SendHandler from '../send_handler';

type Props = {
    testID?: string;
    channelId: string;
    rootId?: string;
    screenId: string;
    drafts: DraftModel[];
    maxFileSize: number;
    maxFileCount: number;
    canUploadFiles: boolean;
}

type FileHandler = {
    [fileId: string]: {
        loading: boolean;
        progress: number;
        error?: string;
        cancel?: () => void;
        fileInfo?: FileInfo;
    };
}

const emptyFileList: FileInfo[] = [];
const UPLOAD_INTERVAL = 1000;
const UPLOAD_ERROR_SHOW_INTERVAL = 5000;

function prepareUpload(file: FileInfo, fileHandler: React.MutableRefObject<FileHandler>, serverUrl: string, channelId: string) {
    fileHandler.current[file.clientId!] = {
        loading: true,
        progress: 0,
    };
    const onProgress = (progress: number) => {
        fileHandler.current[file.clientId!].progress = progress;
    };

    const onComplete = (response: ClientResponse) => {
        const handler = fileHandler.current[file.clientId!];
        delete (handler.cancel);
        handler.loading = false;
        if (response.code !== 201) {
            handler.error = (response.data as any).message;
            return;
        }
        if (!response.data) {
            handler.error = 'Failed to upload the file: no data received';
            return;
        }
        const data = response.data.file_infos as FileInfo[];
        if (!data || !data.length) {
            handler.error = 'Failed to upload the file: no data received';
            return;
        }

        handler.fileInfo = data[0];
    };

    const onError = (response: ClientResponseError) => {
        fileHandler.current[file.clientId!].loading = false;
        fileHandler.current[file.clientId!].error = response.message;
    };

    const {error, cancel} = uploadFile(serverUrl, file, channelId, onProgress, onComplete, onError);
    if (error) {
        fileHandler.current[file.clientId!].error = error.message;
        fileHandler.current[file.clientId!].loading = false;
        return;
    }
    fileHandler.current[file.clientId!].cancel = cancel;
}

function fileSizeWarning(intl: IntlShape, maxFileSize: number) {
    return intl.formatMessage({
        id: 'file_upload.fileAbove',
        defaultMessage: 'Files must be less than {max}',
    }, {
        max: getFormattedFileSize(maxFileSize),
    });
}

function fileMaxWarning(intl: IntlShape, maxFileCount: number) {
    return intl.formatMessage({
        id: 'mobile.file_upload.max_warning',
        defaultMessage: 'Uploads limited to {count} files maximum.',
    }, {
        count: maxFileCount,
    });
}

function uploadDisabledWarning(intl: IntlShape) {
    return intl.formatMessage({
        id: 'mobile.file_upload.disabled2',
        defaultMessage: 'File uploads from mobile are disabled.',
    });
}

export default function DraftHandler(props: Props) {
    const {
        testID,
        channelId,
        rootId = '',
        screenId,
        drafts,
        maxFileSize,
        maxFileCount,
        canUploadFiles,
    } = props;

    const serverUrl = useServerUrl();
    const intl = useIntl();

    const [currentValue, setCurrentValue] = useState(drafts[0]?.message || '');
    const [currentFiles, setCurrentFiles] = useState<FileInfo[]>(drafts[0]?.files || emptyFileList);
    const [uploadError, setUploadError] = useState<React.ReactNode>(null);
    const [uploading, setUploading] = useState(false);

    const uploadInterval = useRef<NodeJS.Timer>();
    const uploadErrorTimeout = useRef<NodeJS.Timeout>();
    const fileHandler = useRef<FileHandler>({});
    const handlerJob = useRef<() => void>(() => {/* Do nothing */});

    const clearDraft = useCallback(() => {
        removeDraft(serverUrl, channelId, rootId);
        setCurrentValue('');
        setCurrentFiles([]);
    }, [serverUrl, channelId, rootId]);

    const updateValue = useCallback((newValue: string) => {
        setCurrentValue(newValue);

        if (!newValue && !currentFiles?.length) {
            removeDraft(serverUrl, channelId, rootId);
            return;
        }

        updateDraft(serverUrl, {
            channel_id: channelId,
            root_id: rootId,
            files: currentFiles,
            message: newValue,
        });
    }, [serverUrl, channelId, rootId, currentFiles]);

    const updateFiles = useCallback((newFiles: FileInfo[]) => {
        setCurrentFiles(newFiles);

        if (!currentValue && !newFiles?.length) {
            removeDraft(serverUrl, channelId, rootId);
            return;
        }

        updateDraft(serverUrl, {
            channel_id: channelId,
            root_id: rootId,
            files: newFiles,
            message: currentValue,
        });
    }, [serverUrl, channelId, rootId, currentValue]);

    const newUpdateError = useCallback((error: React.ReactNode) => {
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
            newUpdateError(uploadDisabledWarning(intl));
            return;
        }

        const availableCount = maxFileCount - currentFiles.length;
        if (newFiles.length > availableCount) {
            newUpdateError(fileMaxWarning(intl, maxFileCount));
            return;
        }

        const largeFile = newFiles.find((file) => file.size > maxFileSize);
        if (largeFile) {
            newUpdateError(fileSizeWarning(intl, maxFileSize));
            return;
        }

        for (const file of newFiles) {
            prepareUpload(file, fileHandler, serverUrl, channelId);
        }

        setUploading(true);
        newUpdateError(null);

        const newFileList = [...currentFiles, ...newFiles];
        updateFiles(newFileList);
    }, [intl, maxFileCount, maxFileSize, serverUrl, channelId, currentFiles, updateFiles]);

    const removeFile = useCallback((file: FileInfo) => {
        const handler = fileHandler.current[file.clientId!];
        if (handler) {
            handler.cancel?.();
        }

        const newFileList = currentFiles.filter((f) => f.clientId !== file.clientId);
        updateFiles(newFileList);
    }, [currentFiles, updateFiles]);

    const retryFileUpload = useCallback((file: FileInfo) => {
        const index = currentFiles.findIndex((f) => f.clientId === file.clientId);
        if (index == null) {
            return;
        }

        const newFile = {...file};
        newFile.loading = true;
        newFile.progress = 0;
        newFile.failed = false;

        prepareUpload(newFile, fileHandler, serverUrl, channelId);
        setUploading(true);
        updateFiles([...currentFiles.slice(0, index), newFile, ...currentFiles.slice(index + 1)]);
    }, [serverUrl, channelId, currentFiles, updateFiles]);

    useEffect(() => {
        return () => {
            if (uploadInterval.current) {
                clearInterval(uploadInterval.current);
            }
            if (uploadErrorTimeout.current) {
                clearTimeout(uploadErrorTimeout.current);
            }
        };
    }, []);

    useEffect(() => {
        if (uploading && !uploadInterval.current) {
            uploadInterval.current = setInterval(() => handlerJob.current(), UPLOAD_INTERVAL);
        }

        if (!uploading && uploadInterval.current) {
            clearTimeout(uploadInterval.current);
            uploadInterval.current = undefined;
        }
    }, [uploading]);

    useEffect(() => {
        handlerJob.current = () => {
            let changed = false;
            let stillUploading = false;
            const newFiles: FileInfo[] = [];
            for (const file of currentFiles) {
                const newFile = {...file};
                const currentFileHandler = fileHandler.current[newFile.clientId!];
                if (currentFileHandler) {
                    if (currentFileHandler.fileInfo) {
                        changed = true;
                        currentFileHandler.fileInfo.clientId = file.clientId;
                        currentFileHandler.fileInfo.localPath = file.localPath;
                        newFiles.push(currentFileHandler.fileInfo);
                        continue;
                    }
                    changed = changed || file.loading !== currentFileHandler.loading || file.progress !== currentFileHandler.progress;
                    newFile.loading = currentFileHandler.loading;
                    newFile.progress = currentFileHandler.progress;
                    if (currentFileHandler.error) {
                        newUpdateError(currentFileHandler.error);
                        newFile.failed = true;
                    }
                    if (!currentFileHandler.loading) {
                        delete fileHandler.current[newFile.clientId!];
                    }
                }
                stillUploading = stillUploading || Boolean(newFile.loading);
                newFiles.push(newFile);
            }
            if (changed) {
                updateFiles(newFiles);
            }
            if (!stillUploading) {
                setUploading(false);
            }
        };
    }, [currentFiles, updateFiles]);

    return (
        <SendHandler
            testID={testID}
            channelId={channelId}
            rootId={rootId}
            screenId={screenId}

            value={currentValue}
            files={currentFiles}
            clearDraft={clearDraft}
            updateValue={updateValue}
            addFiles={addFiles}
            uploadFileError={uploadError}
            removeFiles={removeFile}
            retryFileUpload={retryFileUpload}
        />
    );
}
