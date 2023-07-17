// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {forwardRef, useImperativeHandle, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Platform, StatusBar, type StatusBarStyle, StyleSheet, TouchableOpacity, View} from 'react-native';
import FileViewer from 'react-native-file-viewer';
import FileSystem from 'react-native-fs';
import tinyColor from 'tinycolor2';

import ProgressBar from '@components/progress_bar';
import {DOWNLOAD_TIMEOUT} from '@constants/network';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import NetworkManager from '@managers/network_manager';
import {alertDownloadDocumentDisabled, alertDownloadFailed, alertFailedToOpenDocument} from '@utils/document';
import {getFullErrorMessage, isErrorWithMessage} from '@utils/errors';
import {fileExists, getLocalFilePathFromFile} from '@utils/file';
import {emptyFunction} from '@utils/general';
import {logDebug} from '@utils/log';

import FileIcon from './file_icon';

import type {Client} from '@client/rest';
import type {ClientResponse, ProgressPromise} from '@mattermost/react-native-network-client';

export type DocumentFileRef = {
    handlePreviewPress: () => void;
}

type DocumentFileProps = {
    backgroundColor?: string;
    canDownloadFiles: boolean;
    file: FileInfo;
}

const styles = StyleSheet.create({
    progress: {
        justifyContent: 'flex-end',
        height: 48,
        left: 2,
        top: 5,
        width: 44,
    },
});

const DocumentFile = forwardRef<DocumentFileRef, DocumentFileProps>(({backgroundColor, canDownloadFiles, file}: DocumentFileProps, ref) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const [didCancel, setDidCancel] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [preview, setPreview] = useState(false);
    const [progress, setProgress] = useState(0);
    let client: Client | undefined;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch {
        // do nothing
    }
    const downloadTask = useRef<ProgressPromise<ClientResponse>>();

    const cancelDownload = () => {
        setDidCancel(true);
        if (downloadTask.current?.cancel) {
            downloadTask.current.cancel();
        }
    };

    const downloadAndPreviewFile = async () => {
        setDidCancel(false);
        let path;

        try {
            path = getLocalFilePathFromFile(serverUrl, file);
            const exists = await fileExists(path);
            if (exists) {
                openDocument();
            } else {
                setDownloading(true);
                downloadTask.current = client?.apiClient.download(client?.getFileRoute(file.id!), path!.replace('file://', ''), {timeoutInterval: DOWNLOAD_TIMEOUT});
                downloadTask.current?.progress?.(setProgress);

                await downloadTask.current;
                setProgress(1);
                openDocument();
            }
        } catch (error) {
            if (path) {
                FileSystem.unlink(path).catch(emptyFunction);
            }
            setDownloading(false);
            setProgress(0);

            if (!isErrorWithMessage(error) || error.message !== 'cancelled') {
                logDebug('error on downloadAndPreviewFile', getFullErrorMessage(error));
                alertDownloadFailed(intl);
            }
        }
    };

    const handlePreviewPress = async () => {
        if (!canDownloadFiles) {
            alertDownloadDocumentDisabled(intl);
            return;
        }

        if (downloading && progress < 1) {
            cancelDownload();
        } else if (downloading) {
            setProgress(0);
            setDidCancel(true);
            setDownloading(false);
        } else {
            downloadAndPreviewFile();
        }
    };

    const onDonePreviewingFile = () => {
        setProgress(0);
        setDownloading(false);
        setPreview(false);
        setStatusBarColor();
    };

    const openDocument = () => {
        if (!didCancel && !preview) {
            const path = getLocalFilePathFromFile(serverUrl, file);
            setPreview(true);
            setStatusBarColor('dark-content');
            FileViewer.open(path!, {
                displayName: file.name,
                onDismiss: onDonePreviewingFile,
                showOpenWithDialog: true,
                showAppsSuggestions: true,
            }).then(() => {
                setDownloading(false);
                setProgress(0);
            }).catch(() => {
                alertFailedToOpenDocument(file, intl);
                onDonePreviewingFile();

                if (path) {
                    FileSystem.unlink(path).catch(emptyFunction);
                }
            });
        }
    };

    const setStatusBarColor = (style: StatusBarStyle = 'light-content') => {
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
    };

    useImperativeHandle(ref, () => ({
        handlePreviewPress,
    }), []);

    const icon = (
        <FileIcon
            backgroundColor={backgroundColor}
            file={file}
        />
    );

    let fileAttachmentComponent = icon;
    if (downloading) {
        fileAttachmentComponent = (
            <>
                {icon}
                <View style={[StyleSheet.absoluteFill, styles.progress]}>
                    <ProgressBar
                        progress={progress || 0.1}
                        color={theme.buttonBg}
                    />
                </View>
            </>
        );
    }

    return (
        <TouchableOpacity onPress={handlePreviewPress}>
            {fileAttachmentComponent}
        </TouchableOpacity>
    );
});

DocumentFile.displayName = 'DocumentFile';

export default DocumentFile;
