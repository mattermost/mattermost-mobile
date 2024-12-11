// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {deleteAsync} from 'expo-file-system';
import {forwardRef, useImperativeHandle, useRef, useState, type ReactNode, useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Platform, StatusBar, type StatusBarStyle} from 'react-native';
import FileViewer from 'react-native-file-viewer';
import tinyColor from 'tinycolor2';

import {downloadFile} from '@actions/remote/file';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {alertDownloadDocumentDisabled, alertDownloadFailed, alertFailedToOpenDocument} from '@utils/document';
import {getFullErrorMessage, isErrorWithMessage} from '@utils/errors';
import {fileExists, getLocalFilePathFromFile} from '@utils/file';
import {logDebug} from '@utils/log';

import type {ClientResponse, ProgressPromise} from '@mattermost/react-native-network-client';

export type DocumentRef = {
    handlePreviewPress: () => void;
}

type DocumentProps = {
    canDownloadFiles: boolean;
    file: FileInfo;
    children: ReactNode;
    onProgress: (progress: number) => void;
}

const Document = forwardRef<DocumentRef, DocumentProps>(({canDownloadFiles, children, onProgress, file}: DocumentProps, ref) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const [didCancel, setDidCancel] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [preview, setPreview] = useState(false);
    const downloadTask = useRef<ProgressPromise<ClientResponse>>();

    const cancelDownload = () => {
        setDidCancel(true);
        if (downloadTask.current?.cancel) {
            downloadTask.current.cancel();
        }
    };

    const downloadAndPreviewFile = useCallback(async () => {
        setDidCancel(false);
        let path;
        let exists = false;

        try {
            path = file.localPath || '';
            if (path) {
                exists = await fileExists(path);
            }

            if (!exists) {
                path = getLocalFilePathFromFile(serverUrl, file);
                exists = await fileExists(path);
            }

            if (exists) {
                openDocument();
            } else {
                setDownloading(true);
                downloadTask.current = downloadFile(serverUrl, file.id!, path!);
                downloadTask.current?.progress?.(onProgress);

                await downloadTask.current;
                onProgress(1);
                openDocument();
            }
        } catch (error) {
            if (path) {
                deleteAsync(path, {idempotent: true});
            }
            setDownloading(false);
            onProgress(0);

            if (!isErrorWithMessage(error) || error.message !== 'cancelled') {
                logDebug('error on downloadAndPreviewFile', getFullErrorMessage(error));
                alertDownloadFailed(intl);
            }
        }
    }, [file, onProgress]);

    const setStatusBarColor = useCallback((style: StatusBarStyle = 'light-content') => {
        if (Platform.OS === 'ios') {
            if (style) {
                StatusBar.setBarStyle(style, true);
            } else {
                const headerColor = tinyColor(theme.sidebarHeaderBg);
                let barStyle: StatusBarStyle = 'light-content';
                if (headerColor.isLight() && Platform.OS === 'ios') {
                    barStyle = 'dark-content';
                }
                StatusBar.setBarStyle(barStyle, true);
            }
        }
    }, [theme]);

    const openDocument = useCallback(async () => {
        if (!didCancel && !preview) {
            let path = file.localPath || '';
            let exists = false;
            if (path) {
                exists = await fileExists(path);
            }

            if (!exists) {
                path = getLocalFilePathFromFile(serverUrl, file);
            }

            setPreview(true);
            setStatusBarColor('dark-content');
            FileViewer.open(path!.replace('file://', ''), {
                displayName: file.name,
                onDismiss: onDonePreviewingFile,
                showOpenWithDialog: true,
                showAppsSuggestions: true,
            }).then(() => {
                setDownloading(false);
                onProgress(0);
            }).catch(() => {
                alertFailedToOpenDocument(file, intl);
                onDonePreviewingFile();

                if (path) {
                    deleteAsync(path, {idempotent: true});
                }
            });
        }
    }, [didCancel, preview, file, onProgress, setStatusBarColor]);

    const handlePreviewPress = useCallback(async () => {
        if (!canDownloadFiles) {
            alertDownloadDocumentDisabled(intl);
            return;
        }

        if (downloading) {
            onProgress(0);
            cancelDownload();
            setDownloading(false);
        } else {
            downloadAndPreviewFile();
        }
    }, [canDownloadFiles, downloadAndPreviewFile, downloading, intl, onProgress, openDocument]);

    const onDonePreviewingFile = () => {
        onProgress(0);
        setDownloading(false);
        setPreview(false);
        setStatusBarColor();
    };

    useImperativeHandle(ref, () => ({
        handlePreviewPress,
    }), [handlePreviewPress]);

    return children;
});

Document.displayName = 'Document';

export default Document;
