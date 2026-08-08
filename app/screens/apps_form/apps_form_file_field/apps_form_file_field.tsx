// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Text, View} from 'react-native';

import {fetchFilesInfo, uploadFile} from '@actions/remote/file';
import Button from '@components/button';
import UploadItemShared, {type UploadItemFile} from '@components/upload_item_shared';
import RemoveButton from '@components/upload_item_shared/remove_button';
import {useTheme} from '@context/theme';
import useDidMount from '@hooks/did_mount';
import {usePreventDoubleTap} from '@hooks/utils';
import {getFullErrorMessage} from '@utils/errors';
import {uploadDisabledWarning} from '@utils/file';
import {generateId} from '@utils/general';
import {logDebug} from '@utils/log';
import {openAttachmentOptions} from '@utils/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {ClientResponse, ClientResponseError} from '@mattermost/react-native-network-client';

const messages = defineMessages({
    chooseFile: {
        id: 'apps_form.file_field.choose_file',
        defaultMessage: 'Choose File',
    },
    chooseFiles: {
        id: 'apps_form.file_field.choose_files',
        defaultMessage: 'Choose Files',
    },
    uploadFailed: {
        id: 'apps_form.file_field.upload_failed',
        defaultMessage: 'Upload failed',
    },
});

type CancelFn = () => void;

type FileStatus = 'uploading' | 'uploaded' | 'failed';

type FileEntry = {
    stableId: string;
    name: string;
    localPath: string;
    mime_type: string;
    size: number;
    status: FileStatus;
    progress: number;
    fileId?: string;
    extension?: string;
    error?: string;
};

const uploadedEntryFromFileInfo = (file: FileInfo): FileEntry => ({
    stableId: file.id || generateId(),
    name: file.name,
    localPath: '',
    mime_type: file.mime_type || '',
    size: file.size || 0,
    status: 'uploaded',
    progress: 1,
    fileId: file.id,
    extension: file.extension,
});

const patchEntry = (entries: FileEntry[], stableId: string, patch: Partial<FileEntry>): FileEntry[] =>
    entries.map((e) => (e.stableId === stableId ? {...e, ...patch} : e));

const removeEntryById = (entries: FileEntry[], stableId: string): FileEntry[] =>
    entries.filter((e) => e.stableId !== stableId);

// Curried updaters keep the setEntries call sites flat (avoids deeply nested callbacks).
const patchEntryUpdater = (stableId: string, patch: Partial<FileEntry>) =>
    (entries: FileEntry[]): FileEntry[] => patchEntry(entries, stableId, patch);

const removeEntryUpdater = (stableId: string) =>
    (entries: FileEntry[]): FileEntry[] => removeEntryById(entries, stableId);

const joinedUploadedFileIds = (entries: FileEntry[]): string => {
    const ids: string[] = [];
    for (const entry of entries) {
        if (entry.fileId) {
            ids.push(entry.fileId);
        }
    }
    return ids.join(',');
};

export type Props = {
    name: string;
    displayName: string;
    helpText?: string;
    errorText?: string;
    value: string; // comma-joined file IDs
    onChange: (name: string, value: string) => void;
    onPendingChange?: (hasPending: boolean) => void;
    allowMultiple?: boolean;
    readonly?: boolean;
    canUploadFiles: boolean;
    channelId: string;
    serverUrl: string;
    testID?: string;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        marginHorizontal: 15,
        marginTop: 10,
        marginBottom: 10,
    },
    label: {
        ...typography('Body', 100, 'SemiBold'),
        color: theme.centerChannelColor,
        marginBottom: 8,
    },
    helpText: {
        ...typography('Body', 75),
        color: changeOpacity(theme.centerChannelColor, 0.64),
        marginTop: 4,
    },
    errorText: {
        ...typography('Body', 75),
        color: theme.errorTextColor,
        marginTop: 4,
    },
    warningText: {
        ...typography('Body', 75),
        color: theme.errorTextColor,
        marginTop: 4,
    },
    fileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        position: 'relative',
    },
    failedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 4,
        backgroundColor: changeOpacity(theme.errorTextColor, 0.08),
    },
    failedText: {
        ...typography('Body', 75),
        color: theme.errorTextColor,
        flex: 1,
    },
    button: {
        marginTop: 8,
        alignSelf: 'flex-start',
    },
}));

function AppsFormFileField({
    name,
    displayName,
    helpText,
    errorText,
    value,
    onChange,
    onPendingChange,
    allowMultiple = false,
    readonly = false,
    canUploadFiles,
    channelId,
    serverUrl,
    testID,
}: Props) {
    const intl = useIntl();
    const theme = useTheme();
    const style = getStyleSheet(theme);

    const [entries, setEntries] = useState<FileEntry[]>([]);
    const cancelMapRef = useRef<Map<string, CancelFn>>(new Map());
    const isMountedRef = useRef(true);
    const hasInteractedRef = useRef(false);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const onPendingChangeRef = useRef(onPendingChange);
    onPendingChangeRef.current = onPendingChange;

    useEffect(() => {
        const cancelMap = cancelMapRef.current;
        return () => {
            isMountedRef.current = false;
            for (const cancel of cancelMap.values()) {
                cancel();
            }
            cancelMap.clear();
            onPendingChangeRef.current?.(false);
        };
    }, []);

    // Pre-populate previews from an existing value (the file IDs the server/plugin
    // sends back when re-opening the dialog). Mount-time only by design — re-opening
    // mounts a fresh screen, and a cleared value (file-upload-clear) yields no entries.
    useDidMount(() => {
        const ids = value.split(',').map((id) => id.trim()).filter(Boolean);
        if (!ids.length) {
            return;
        }

        (async () => {
            const {files} = await fetchFilesInfo(serverUrl, ids);

            // Skip if the user picked/removed files while the fetch was in flight —
            // don't clobber their changes with the late hydration result.
            if (!isMountedRef.current || hasInteractedRef.current || !files.length) {
                return;
            }

            const hydratedEntries = files.map(uploadedEntryFromFileInfo);
            setEntries(hydratedEntries);

            const hydratedIds = joinedUploadedFileIds(hydratedEntries);
            const requestedIds = ids.join(',');
            if (hydratedIds !== requestedIds) {
                onChangeRef.current(name, hydratedIds);
            }
        })().catch((error) => {
            // fetchFilesInfo is designed not to throw, but guard the bare IIFE
            // against an unhandled rejection if that ever changes.
            logDebug('apps_form_file_field hydration failed', getFullErrorMessage(error));
        });
    });

    // Notify parent the field isn't ready while an upload is in flight OR a failed
    // entry is present, so the form submit stays blocked until failures are resolved.
    const isUploading = entries.some((e) => e.status === 'uploading');
    const hasFailed = entries.some((e) => e.status === 'failed');
    useEffect(() => {
        onPendingChange?.(isUploading || hasFailed);
    }, [isUploading, hasFailed, onPendingChange]);

    // Push completed file IDs up to the parent form whenever entries settle
    useEffect(() => {
        if (entries.some((e) => e.status === 'uploading') || !hasInteractedRef.current) {
            return;
        }
        const ids = entries.filter((e) => e.status === 'uploaded' && e.fileId).map((e) => e.fileId!);
        onChangeRef.current(name, ids.join(','));
    }, [entries, name]);

    const startUpload = useCallback((entry: FileEntry) => {
        const extractedFile: ExtractedFileInfo = {
            name: entry.name,
            mime_type: entry.mime_type,
            size: entry.size,
            localPath: entry.localPath,
            clientId: entry.stableId,
        } as ExtractedFileInfo;

        const onProgress = (fraction: number) => {
            if (!isMountedRef.current) {
                return;
            }
            setEntries(patchEntryUpdater(entry.stableId, {progress: fraction}));
        };

        const onComplete = (response: ClientResponse) => {
            if (!isMountedRef.current) {
                return;
            }
            cancelMapRef.current.delete(entry.stableId);

            if (response.code !== 201 || !response.data) {
                const msg = (response.data?.message as string | undefined) || intl.formatMessage(messages.uploadFailed);
                setEntries(patchEntryUpdater(entry.stableId, {status: 'failed', error: msg}));
                return;
            }

            const fileInfos = response.data.file_infos as FileInfo[] | undefined;
            const fileInfo = fileInfos?.[0];
            if (!fileInfo?.id) {
                const msg = intl.formatMessage(messages.uploadFailed);
                setEntries(patchEntryUpdater(entry.stableId, {status: 'failed', error: msg}));
                return;
            }

            setEntries(patchEntryUpdater(entry.stableId, {status: 'uploaded', fileId: fileInfo.id, progress: 1}));
        };

        const onError = (response: ClientResponseError) => {
            if (!isMountedRef.current) {
                return;
            }
            cancelMapRef.current.delete(entry.stableId);
            const msg = response.message || getFullErrorMessage(response) || intl.formatMessage(messages.uploadFailed);
            setEntries(patchEntryUpdater(entry.stableId, {status: 'failed', error: msg}));
        };

        const result = uploadFile(serverUrl, extractedFile, channelId, onProgress, onComplete, onError);
        if ('error' in result && result.error) {
            const msg = getFullErrorMessage(result.error) || intl.formatMessage(messages.uploadFailed);
            setEntries(patchEntryUpdater(entry.stableId, {status: 'failed', error: msg}));
            return;
        }
        if ('cancel' in result && result.cancel) {
            cancelMapRef.current.set(entry.stableId, result.cancel);
        }
    }, [serverUrl, channelId, intl]);

    const handleUploadFiles = useCallback((files: ExtractedFileInfo[]) => {
        if (readonly) {
            return;
        }
        hasInteractedRef.current = true;

        // Single-file mode: only the first selection counts.
        const incoming = allowMultiple ? files : files.slice(0, 1);
        if (!incoming.length) {
            return;
        }

        const newEntries: FileEntry[] = incoming.map((f) => ({
            stableId: f.clientId || generateId(),
            name: f.name,
            localPath: f.localPath || '',
            mime_type: f.mime_type,
            size: f.size || 0,
            status: 'uploading',
            progress: 0,
        }));

        if (!allowMultiple) {
            // Single-file replace: cancel any in-flight upload from the previous
            // pick so the superseded request doesn't keep running into a no-op.
            // Done outside the setEntries updater to keep the updater pure.
            for (const [, cancel] of cancelMapRef.current) {
                cancel();
            }
            cancelMapRef.current.clear();
        }

        setEntries((prev) => (allowMultiple ? [...prev, ...newEntries] : newEntries));

        for (const entry of newEntries) {
            startUpload(entry);
        }
    }, [allowMultiple, readonly, startUpload]);

    const handleChoosePress = useCallback(() => {
        openAttachmentOptions({
            onUploadFiles: handleUploadFiles,
            canUploadFiles,

            // Single-file fields cap the picker selection at 1.
            maxFileCount: allowMultiple ? undefined : 1,
            fileCount: entries.length,
            maxFilesReached: !allowMultiple && entries.length > 0,
        });
    }, [allowMultiple, entries.length, handleUploadFiles, canUploadFiles]);

    const onChoosePress = usePreventDoubleTap(handleChoosePress);

    const handleRemove = useCallback((stableId: string) => {
        hasInteractedRef.current = true;

        const cancel = cancelMapRef.current.get(stableId);
        if (cancel) {
            cancel();
            cancelMapRef.current.delete(stableId);
        }

        setEntries(removeEntryUpdater(stableId));
    }, []);

    const chooseBtnText = allowMultiple? intl.formatMessage(messages.chooseFiles): intl.formatMessage(messages.chooseFile);

    return (
        <View
            style={style.container}
            testID={testID || `AppFormElement.${name}`}
        >
            <Text style={style.label}>{displayName}</Text>

            {entries.map((entry) => {
                if (entry.status === 'failed') {
                    return (
                        <View
                            key={entry.stableId}
                            style={style.failedRow}
                            testID={`${name}.file.failed.${entry.stableId}`}
                        >
                            <Text
                                style={style.failedText}
                                numberOfLines={2}
                            >
                                {entry.name}{': '}{entry.error}
                            </Text>
                            {!readonly && (
                                <RemoveButton
                                    onPress={() => handleRemove(entry.stableId)}
                                    testID={`${name}.file.remove.${entry.stableId}`}
                                />
                            )}
                        </View>
                    );
                }

                const uploadItemFile: UploadItemFile = {
                    name: entry.name,
                    mime_type: entry.mime_type,
                    size: entry.size,
                    uri: entry.localPath,
                    clientId: entry.stableId,
                    id: entry.fileId,
                    extension: entry.extension,
                };

                return (
                    <View
                        key={entry.stableId}
                        style={style.fileRow}
                        testID={`${name}.file.row.${entry.stableId}`}
                    >
                        <UploadItemShared
                            file={uploadItemFile}
                            loading={entry.status === 'uploading'}
                            progress={entry.progress}
                            fullWidth={true}
                            testID={`${name}.file.item.${entry.stableId}`}
                        />
                        {!readonly && (
                            <RemoveButton
                                onPress={() => handleRemove(entry.stableId)}
                                testID={`${name}.file.remove.${entry.stableId}`}
                            />
                        )}
                    </View>
                );
            })}

            <Button
                theme={theme}
                onPress={onChoosePress}
                disabled={!canUploadFiles || isUploading || readonly || (!allowMultiple && entries.length > 0)}
                text={chooseBtnText}
                size='m'
                emphasis='tertiary'
                testID={`${name}.choose.button`}
                buttonContainerStyle={style.button}
            />

            {!canUploadFiles && (
                <Text
                    style={style.warningText}
                    testID={`${name}.upload.disabled.warning`}
                >
                    {uploadDisabledWarning(intl)}
                </Text>
            )}

            {Boolean(errorText) && (
                <Text
                    style={style.errorText}
                    testID={`${name}.error.text`}
                >
                    {errorText}
                </Text>
            )}

            {Boolean(helpText) && (
                <Text
                    style={style.helpText}
                    testID={`${name}.help.text`}
                >
                    {helpText}
                </Text>
            )}
        </View>
    );
}

export default AppsFormFileField;
