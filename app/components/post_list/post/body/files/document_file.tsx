// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ClientResponse, ProgressPromise} from '@mattermost/react-native-network-client';
import * as FileSystem from 'expo-file-system';
import React, {forwardRef, useImperativeHandle, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Platform, StatusBar, StatusBarStyle, StyleSheet, View} from 'react-native';
import FileViewer from 'react-native-file-viewer';
import tinyColor from 'tinycolor2';

import ProgressBar from '@components/progress_bar';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {Device} from '@constants';
import {DOWNLOAD_TIMEOUT} from '@constants/network';
import {useServerUrl} from '@context/server';
import NetworkManager from '@init/network_manager';
import {alertDownloadDocumentDisabled, alertDownloadFailed, alertFailedToOpenDocument} from '@utils/document';
import {getLocalFilePathFromFile} from '@utils/file';

import FileIcon from './file_icon';

import type {Client} from '@client/rest';

export type DocumentFileRef = {
    handlePreviewPress: () => void;
}

type DocumentFileProps = {
    backgroundColor?: string;
    canDownloadFiles: boolean;
    file: FileInfo;
    theme: Theme;
}

const {DOCUMENTS_PATH} = Device;
const styles = StyleSheet.create({
    progress: {
        justifyContent: 'flex-end',
        height: 48,
        left: 2,
        top: 5,
        width: 44,
    },
});

const DocumentFile = forwardRef<DocumentFileRef, DocumentFileProps>(({backgroundColor, canDownloadFiles, file, theme}: DocumentFileProps, ref) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
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
        const path = getLocalFilePathFromFile(DOCUMENTS_PATH, serverUrl, file);
        setDidCancel(false);

        try {
            let exists = false;
            if (path) {
                const info = await FileSystem.getInfoAsync(path);
                exists = info.exists;
            }
            if (exists) {
                openDocument();
            } else {
                setDownloading(true);
                downloadTask.current = client?.apiClient.download(client?.getFileRoute(file.id!), path!, {timeoutInterval: DOWNLOAD_TIMEOUT});
                downloadTask.current?.progress?.(setProgress);

                await downloadTask.current;
                setProgress(1);
                openDocument();
            }
        } catch (error) {
            if (path) {
                FileSystem.deleteAsync(path, {idempotent: true});
            }
            setDownloading(false);
            setProgress(0);

            if ((error as Error).message !== 'cancelled') {
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
            const path = getLocalFilePathFromFile(DOCUMENTS_PATH, serverUrl, file);
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
                    FileSystem.deleteAsync(path, {idempotent: true});
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
            theme={theme}
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
        <TouchableWithFeedback
            onPress={handlePreviewPress}
            type={'opacity'}
        >
            {fileAttachmentComponent}
        </TouchableWithFeedback>
    );
});

export default DocumentFile;
