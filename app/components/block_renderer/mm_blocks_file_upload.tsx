// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Text, View} from 'react-native';

import {fetchFileInfo, uploadFile} from '@actions/remote/file';
import Button from '@components/button';
import UploadItemShared from '@components/upload_item_shared';
import RemoveButton from '@components/upload_item_shared/remove_button';
import {MAX_DIALOG_FILE_IDS} from '@constants/integrations';
import {useServerUrl} from '@context/server';
import useDidMount from '@hooks/did_mount';
import {usePreventDoubleTap} from '@hooks/utils';
import {fileMaxWarning, getExtensionFromMime} from '@utils/file';
import FilePickerUtil from '@utils/file/file_picker';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {ClientResponse} from '@mattermost/react-native-network-client';

const messages = defineMessages({
    chooseFile: {id: 'mm_blocks.file_input.choose_file', defaultMessage: 'Choose File'},
    chooseFiles: {id: 'mm_blocks.file_input.choose_files', defaultMessage: 'Choose Files'},
    photos: {id: 'mm_blocks.file_input.photos', defaultMessage: 'Photos'},
    uploadFailed: {id: 'mm_blocks.file_input.upload_failed', defaultMessage: 'Upload failed'},
});

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        marginHorizontal: 15,
        gap: 12,
    },
    row: {
        paddingTop: 5,
        paddingRight: 10,
    },
    rowError: {
        color: theme.errorTextColor,
        marginTop: 4,
        ...typography('Body', 75, 'Regular'),
    },
    buttons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    placeholder: {
        color: changeOpacity(theme.centerChannelColor, 0.64),
        ...typography('Body', 75, 'Regular'),
    },
    error: {
        color: theme.errorTextColor,
        ...typography('Body', 75, 'Regular'),
    },
}));

type CancelUpload = () => void;

type UploadStatus = 'uploading' | 'uploaded' | 'failed';

type UploadFileState = {
    clientId: string;
    name: string;
    extension?: string;
    mimeType?: string;
    size?: number;
    uri?: string;
    status: UploadStatus;
    progress: number;
    fileId?: string;
    error?: string;
};

function patchFile(files: UploadFileState[], clientId: string, patch: Partial<UploadFileState>): UploadFileState[] {
    return files.map((f) => (f.clientId === clientId ? {...f, ...patch} : f));
}

function withoutFile(files: UploadFileState[], clientId: string): UploadFileState[] {
    return files.filter((f) => f.clientId !== clientId);
}

function completedFileIds(files: UploadFileState[]): string[] {
    const fileIds: string[] = [];
    for (const file of files) {
        if (file.status === 'uploaded' && file.fileId) {
            fileIds.push(file.fileId);
        }
    }
    return fileIds;
}

/** Resolves already-uploaded IDs into displayable rows; IDs the server no longer serves are dropped. */
async function hydrateFileIds(serverUrl: string, fileIds: string[]): Promise<UploadFileState[]> {
    const hydrated: UploadFileState[] = [];
    for (const fileId of fileIds) {
        // eslint-disable-next-line no-await-in-loop
        const {file} = await fetchFileInfo(serverUrl, fileId);
        if (file) {
            hydrated.push({
                clientId: fileId,
                name: file.name,
                extension: file.extension,
                mimeType: file.mime_type,
                size: file.size,
                status: 'uploaded',
                progress: 1,
                fileId,
            });
        }
    }
    return hydrated;
}

type FileUploadRowProps = {
    file: UploadFileState;
    disabled: boolean;
    onRemove: (clientId: string) => void;
    onRetry: (clientId: string) => void;
    theme: Theme;
    testID: string;
};

function FileUploadRow({file, disabled, onRemove, onRetry, theme, testID}: FileUploadRowProps) {
    const style = getStyleSheet(theme);
    const failed = file.status === 'failed';

    const handleRemove = useCallback(() => onRemove(file.clientId), [file.clientId, onRemove]);
    const handleRetry = useCallback(() => onRetry(file.clientId), [file.clientId, onRetry]);

    const uploadItemFile = useMemo(() => ({
        id: file.fileId,
        clientId: file.clientId,
        name: file.name,
        extension: file.extension,
        size: file.size,
        uri: file.uri,
        mime_type: file.mimeType,
        failed,
    }), [failed, file.clientId, file.extension, file.fileId, file.mimeType, file.name, file.size, file.uri]);

    return (
        <View style={style.row}>
            <UploadItemShared
                file={uploadItemFile}
                loading={file.status === 'uploading'}
                progress={file.progress}
                showRetryButton={failed}
                onRetry={handleRetry}
                hasError={failed}
                fullWidth={true}
                testID={testID}
            />
            {!disabled && (
                <RemoveButton
                    onPress={handleRemove}
                    testID={`${testID}.remove`}
                />
            )}
            {Boolean(file.error) && (
                <Text style={style.rowError}>{file.error}</Text>
            )}
        </View>
    );
}

export type MmBlocksFileUploadProps = {
    channelId: string;

    /** Server file IDs to hydrate on mount (from the field's `initial_value`). */
    value: string[];
    allowMultiple?: boolean;
    disabled?: boolean;
    placeholder?: string;

    /** Called with the settled list of server file IDs whenever uploads or removals finish. */
    onFileSelected: (fileIds: string[]) => void;
    onPendingChange?: (uploading: boolean) => void;
    theme: Theme;
    testID: string;
};

/**
 * File picker + upload widget for `file_input` blocks. Uploads straight to `/files` and exposes
 * the resulting server file IDs; it deliberately bypasses the draft upload manager so nothing
 * is persisted to the draft database.
 */
function MmBlocksFileUpload({
    channelId,
    value,
    allowMultiple = false,
    disabled = false,
    placeholder,
    onFileSelected,
    onPendingChange,
    theme,
    testID,
}: MmBlocksFileUploadProps) {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const style = getStyleSheet(theme);

    const [files, setFiles] = useState<UploadFileState[]>([]);
    const [limitError, setLimitError] = useState<string | undefined>(undefined);

    const filesRef = useRef<UploadFileState[]>(files);
    filesRef.current = files;
    const onFileSelectedRef = useRef(onFileSelected);
    onFileSelectedRef.current = onFileSelected;
    const onPendingChangeRef = useRef(onPendingChange);
    onPendingChangeRef.current = onPendingChange;

    const isMountedRef = useRef(true);
    const hasInteractedRef = useRef(false);
    const cancelUploadsRef = useRef(new Map<string, CancelUpload>());
    const sourceFilesRef = useRef(new Map<string, ExtractedFileInfo>());
    const initialFileIdsRef = useRef(value);

    const maxFiles = allowMultiple ? MAX_DIALOG_FILE_IDS : 1;
    const isUploading = files.some((f) => f.status === 'uploading');
    const atFileLimit = files.length >= maxFiles;
    const uploadFailedMessage = intl.formatMessage(messages.uploadFailed);

    const updateFile = useCallback((clientId: string, patch: Partial<UploadFileState>) => {
        setFiles((prev) => patchFile(prev, clientId, patch));
    }, []);

    const startUpload = useCallback((clientId: string, file: ExtractedFileInfo) => {
        const onProgress = (fractionCompleted: number) => {
            if (isMountedRef.current) {
                updateFile(clientId, {progress: fractionCompleted});
            }
        };

        const onComplete = (response: ClientResponse) => {
            cancelUploadsRef.current.delete(clientId);
            if (!isMountedRef.current) {
                return;
            }

            const uploaded = (response.data?.file_infos as FileInfo[] | undefined)?.[0];
            if (response.code !== 201 || !uploaded) {
                updateFile(clientId, {status: 'failed', progress: 0, error: uploadFailedMessage});
                return;
            }

            updateFile(clientId, {status: 'uploaded', progress: 1, fileId: uploaded.id, error: undefined});
        };

        const onError = () => {
            cancelUploadsRef.current.delete(clientId);
            if (isMountedRef.current) {
                updateFile(clientId, {status: 'failed', progress: 0, error: uploadFailedMessage});
            }
        };

        const {cancel, error} = uploadFile(serverUrl, file, channelId, onProgress, onComplete, onError);

        if (error) {
            updateFile(clientId, {status: 'failed', progress: 0, error: uploadFailedMessage});
            return;
        }

        if (cancel) {
            cancelUploadsRef.current.set(clientId, cancel);
        }
    }, [channelId, serverUrl, updateFile, uploadFailedMessage]);

    const cancelUpload = useCallback((clientId: string) => {
        cancelUploadsRef.current.get(clientId)?.();
        cancelUploadsRef.current.delete(clientId);
        sourceFilesRef.current.delete(clientId);
    }, []);

    const handlePickedFiles = useCallback((picked: ExtractedFileInfo[]) => {
        if (picked.length === 0) {
            return;
        }

        hasInteractedRef.current = true;

        let toUpload = picked;
        let nextLimitError: string | undefined;

        if (allowMultiple) {
            const remaining = maxFiles - filesRef.current.length;
            if (remaining <= 0) {
                setLimitError(fileMaxWarning(intl, maxFiles));
                return;
            }
            if (toUpload.length > remaining) {
                nextLimitError = fileMaxWarning(intl, maxFiles);
                toUpload = toUpload.slice(0, remaining);
            }
        } else {
            if (toUpload.length > 1) {
                nextLimitError = fileMaxWarning(intl, maxFiles);
            }
            toUpload = toUpload.slice(0, 1);
            for (const file of filesRef.current) {
                cancelUpload(file.clientId);
            }
        }

        const added: UploadFileState[] = [];
        const usedClientIds = new Set(sourceFilesRef.current.keys());
        for (const file of toUpload) {
            // Add uniqueness by using a suffix in case the same file is selected multiple times.
            let clientId = file.clientId ?? file.localPath ?? file.name;
            if (usedClientIds.has(clientId)) {
                let suffix = 1;
                while (usedClientIds.has(`${clientId}-${suffix}`)) {
                    suffix += 1;
                }
                clientId = `${clientId}-${suffix}`;
            }
            usedClientIds.add(clientId);
            sourceFilesRef.current.set(clientId, file);
            added.push({
                clientId,
                name: file.name,
                extension: file.extension ?? getExtensionFromMime(file.mime_type),
                mimeType: file.mime_type,
                size: file.size,
                uri: file.localPath,
                status: 'uploading',
                progress: 0,
            });
        }

        setFiles((prev) => (allowMultiple ? [...prev, ...added] : added));
        setLimitError(nextLimitError);

        added.forEach((file, index) => startUpload(file.clientId, toUpload[index]));
    }, [allowMultiple, cancelUpload, intl, maxFiles, startUpload]);

    const browseFiles = usePreventDoubleTap(useCallback(async () => {
        const picker = new FilePickerUtil(intl, handlePickedFiles);
        await picker.attachFileFromFiles(undefined, allowMultiple);
    }, [allowMultiple, handlePickedFiles, intl]));

    const browsePhotos = usePreventDoubleTap(useCallback(async () => {
        const picker = new FilePickerUtil(intl, handlePickedFiles);
        await picker.attachFileFromPhotoGallery(allowMultiple ? maxFiles : 1);
    }, [allowMultiple, handlePickedFiles, intl, maxFiles]));

    const handleRemove = useCallback((clientId: string) => {
        hasInteractedRef.current = true;
        cancelUpload(clientId);
        setFiles((prev) => withoutFile(prev, clientId));
        setLimitError(undefined);
    }, [cancelUpload]);

    const handleRetry = useCallback((clientId: string) => {
        const source = sourceFilesRef.current.get(clientId);
        if (!source) {
            return;
        }
        updateFile(clientId, {status: 'uploading', progress: 0, error: undefined});
        startUpload(clientId, source);
    }, [startUpload, updateFile]);

    useDidMount(() => {
        let cancelled = false;
        const fileIds = initialFileIdsRef.current.slice(0, maxFiles);

        if (fileIds.length > 0) {
            hydrateFileIds(serverUrl, fileIds).then((hydrated) => {
                if (cancelled || !isMountedRef.current) {
                    return;
                }
                setFiles(hydrated);

                // Drop IDs the server no longer serves, but never wipe the field to [] on a
                // total fetch miss — that can clear a valid seeded initial_value after a
                // transient getFileInfo failure (e2e MM-T6246).
                if (hydrated.length > 0 && hydrated.length < fileIds.length) {
                    onFileSelectedRef.current(completedFileIds(hydrated));
                }
            });
        }

        return () => {
            cancelled = true;
            isMountedRef.current = false;
            for (const cancel of cancelUploadsRef.current.values()) {
                cancel();
            }
            cancelUploadsRef.current.clear();
            sourceFilesRef.current.clear();
            onPendingChangeRef.current?.(false);
        };
    });

    useEffect(() => {
        onPendingChangeRef.current?.(isUploading);
    }, [isUploading]);

    // Publish IDs only once uploads settle, and never before the user touches the field, so
    // hydrated initial values are not clobbered on mount.
    useEffect(() => {
        if (isUploading || !hasInteractedRef.current) {
            return;
        }
        onFileSelectedRef.current(completedFileIds(files));
    }, [files, isUploading]);

    const pickDisabled = disabled || atFileLimit;

    return (
        <View
            style={style.container}
            testID={testID}
        >
            {files.map((file) => (
                <FileUploadRow
                    key={file.clientId}
                    file={file}
                    disabled={disabled}
                    onRemove={handleRemove}
                    onRetry={handleRetry}
                    theme={theme}
                    testID={`${testID}.file.${file.clientId}`}
                />
            ))}
            <View style={style.buttons}>
                <Button
                    theme={theme}
                    size='m'
                    emphasis='tertiary'
                    iconName='paperclip'
                    text={intl.formatMessage(allowMultiple ? messages.chooseFiles : messages.chooseFile)}
                    onPress={browseFiles}
                    disabled={pickDisabled}
                    testID={`${testID}.choose_file.button`}
                />
                <Button
                    theme={theme}
                    size='m'
                    emphasis='tertiary'
                    iconName='image-outline'
                    text={intl.formatMessage(messages.photos)}
                    onPress={browsePhotos}
                    disabled={pickDisabled}
                    testID={`${testID}.choose_photo.button`}
                />
            </View>
            {Boolean(limitError) && (
                <Text style={style.error}>{limitError}</Text>
            )}
            {Boolean(placeholder) && files.length === 0 && (
                <Text style={style.placeholder}>{placeholder}</Text>
            )}
        </View>
    );
}

export default MmBlocksFileUpload;
