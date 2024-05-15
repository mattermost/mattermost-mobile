// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Platform, StatusBar, type StatusBarStyle} from 'react-native';
import FileViewer from 'react-native-file-viewer';
import FileSystem from 'react-native-fs';
import tinycolor from 'tinycolor2';

import {buildFilePreviewUrl, buildFileUrl} from '@actions/remote/file';
import {DOWNLOAD_TIMEOUT} from '@constants/network';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import NetworkManager from '@managers/network_manager';
import {alertDownloadFailed, alertFailedToOpenDocument} from '@utils/document';
import {getFullErrorMessage, isErrorWithMessage} from '@utils/errors';
import {fileExists, getLocalFilePathFromFile, isAudio, isGif, isImage, isVideo} from '@utils/file';
import {emptyFunction} from '@utils/general';
import {logDebug} from '@utils/log';

import type {Client} from '@client/rest';
import type {ClientResponse, ProgressPromise} from '@mattermost/react-native-network-client';

export const useImageAttachments = (filesInfo: FileInfo[], publicLinkEnabled: boolean) => {
    const serverUrl = useServerUrl();
    return useMemo(() => {
        return filesInfo.reduce(({images, nonImages}: {images: FileInfo[]; nonImages: FileInfo[]}, file) => {
            const imageFile = isImage(file);
            const videoFile = isVideo(file);
            const audioFile = isAudio(file);
            if (imageFile || (videoFile && publicLinkEnabled)) {
                let uri;
                if (file.localPath) {
                    uri = file.localPath;
                } else {
                    uri = (isGif(file) || videoFile) ? buildFileUrl(serverUrl, file.id!) : buildFilePreviewUrl(serverUrl, file.id!);
                }
                images.push({...file, uri});
            } else {
                let uri = file.uri;
                if (videoFile || audioFile) {
                    // fallback if public links are not enabled
                    uri = buildFileUrl(serverUrl, file.id!);
                }

                nonImages.push({...file, uri});
            }
            return {images, nonImages};
        }, {images: [], nonImages: []});
    }, [filesInfo, publicLinkEnabled]);
};

export const useDownloadFileAndPreview = () => {
    const serverUrl = useServerUrl();
    const intl = useIntl();
    const theme = useTheme();
    const downloadTask = useRef<ProgressPromise<ClientResponse>>();

    const [progress, setProgress] = useState<number>(0);

    const [preview, setPreview] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [didCancel, setDidCancel] = useState(false);

    let client: Client | undefined;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch {
        // do nothing
    }

    const openFile = (file: FileInfo) => {
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

    const downloadAndPreviewFile = async (file: FileInfo) => {
        setDidCancel(false);
        let path;

        try {
            path = getLocalFilePathFromFile(serverUrl, file);
            const exists = await fileExists(path);
            if (exists) {
                openFile(file);
            } else {
                setDownloading(true);
                downloadTask.current = client?.apiClient.download(client?.getFileRoute(file.id!), path!.replace('file://', ''), {timeoutInterval: DOWNLOAD_TIMEOUT});
                downloadTask.current?.progress?.(setProgress);

                await downloadTask.current;
                setProgress(1);
                openFile(file);
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

    const setStatusBarColor = (style: StatusBarStyle = 'light-content') => {
        if (Platform.OS === 'ios') {
            if (style) {
                StatusBar.setBarStyle(style, true);
            } else {
                const headerColor = tinycolor(theme.sidebarHeaderBg);
                let barStyle: StatusBarStyle = 'light-content';
                if (headerColor.isLight() && Platform.OS === 'ios') {
                    barStyle = 'dark-content';
                }
                StatusBar.setBarStyle(barStyle, true);
            }
        }
    };

    const toggleDownloadAndPreview = (file: FileInfo) => {
        if (downloading && progress < 1) {
            cancelDownload();
        } else if (downloading) {
            setProgress(0);
            setDidCancel(true);
            setDownloading(false);
        } else {
            downloadAndPreviewFile(file);
        }
    };

    const cancelDownload = () => {
        setDidCancel(true);
        if (downloadTask.current?.cancel) {
            downloadTask.current.cancel();
        }
    };

    const onDonePreviewingFile = () => {
        setProgress(0);
        setDownloading(false);
        setPreview(false);
        setStatusBarColor();
    };

    return {
        downloading,
        progress,
        toggleDownloadAndPreview,
    };
};
