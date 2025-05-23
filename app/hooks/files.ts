// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {deleteAsync} from 'expo-file-system';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Platform, StatusBar, type StatusBarStyle} from 'react-native';
import FileViewer from 'react-native-file-viewer';
import tinyColor from 'tinycolor2';

import {getLocalFileInfo} from '@actions/local/file';
import {buildFilePreviewUrl, buildFileUrl, downloadFile} from '@actions/remote/file';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {alertDownloadFailed, alertFailedToOpenDocument, alertOnlyPDFSupported} from '@utils/document';
import {getFullErrorMessage, isErrorWithMessage} from '@utils/errors';
import {fileExists, getLocalFilePathFromFile, isAudio, isGif, isImage, isPdf, isVideo} from '@utils/file';
import {getImageSize} from '@utils/gallery';
import {logDebug} from '@utils/log';
import {previewPdf} from '@utils/navigation';

import type {ClientResponse, ProgressPromise} from '@mattermost/react-native-network-client';
import type ChannelBookmarkModel from '@typings/database/models/servers/channel_bookmark';

const getFileInfo = async (serverUrl: string, bookmarks: ChannelBookmarkModel[], cb: (files: FileInfo[]) => void) => {
    const fileInfos: FileInfo[] = [];
    for await (const b of bookmarks) {
        if (b.fileId) {
            const res = await getLocalFileInfo(serverUrl, b.fileId);
            if (res.file) {
                const fileInfo = res.file.toFileInfo(b.ownerId);
                const imageFile = isImage(fileInfo);
                const videoFile = isVideo(fileInfo);

                let uri;
                if (imageFile || videoFile) {
                    if (fileInfo.localPath) {
                        uri = fileInfo.localPath;
                    } else {
                        uri = (isGif(fileInfo) || (imageFile && !fileInfo.has_preview_image) || videoFile) ? buildFileUrl(serverUrl, fileInfo.id!) : buildFilePreviewUrl(serverUrl, fileInfo.id!);
                    }
                } else {
                    uri = fileInfo.localPath || buildFileUrl(serverUrl, fileInfo.id!);
                }

                let {width, height} = fileInfo;
                if (imageFile && !width) {
                    const size = await getImageSize(uri);
                    width = size.width;
                    height = size.height;
                }

                fileInfos.push({...fileInfo, uri, width, height});
            }
        }
    }

    if (fileInfos.length) {
        cb(fileInfos);
    }
};

export const useImageAttachments = (filesInfo: FileInfo[]) => {
    const serverUrl = useServerUrl();
    return useMemo(() => {
        return filesInfo.reduce(({images, nonImages}: {images: FileInfo[]; nonImages: FileInfo[]}, file) => {
            const imageFile = isImage(file);
            const videoFile = isVideo(file);
            const audioFile = isAudio(file);

            if (imageFile || videoFile || audioFile) {
                let uri;
                if (file.localPath) {
                    uri = file.localPath;
                } else {
                    // If no local path and no id, we skip the image
                    if (!file.id) {
                        return {images, nonImages};
                    }
                    uri = (isGif(file) || videoFile || audioFile) ? buildFileUrl(serverUrl, file.id) : buildFilePreviewUrl(serverUrl, file.id);
                }
                images.push({...file, uri});
            } else {
                nonImages.push({...file});
            }
            return {images, nonImages};
        }, {images: [], nonImages: []});
    }, [filesInfo, serverUrl]);
};

export const useChannelBookmarkFiles = (bookmarks: ChannelBookmarkModel[]) => {
    const serverUrl = useServerUrl();
    const [files, setFiles] = useState<FileInfo[]>([]);

    useEffect(() => {
        getFileInfo(serverUrl, bookmarks, setFiles);
    }, [serverUrl, bookmarks]);

    return files;
};

export const useDownloadFileAndPreview = (enableSecureFilePreview: boolean) => {
    const serverUrl = useServerUrl();
    const intl = useIntl();
    const theme = useTheme();
    const downloadTask = useRef<ProgressPromise<ClientResponse>>();

    const [progress, setProgress] = useState<number>(0);

    const [preview, setPreview] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [didCancel, setDidCancel] = useState(false);

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
    }, [theme.sidebarHeaderBg]);

    const onDonePreviewingFile = useCallback(() => {
        setProgress(0);
        setDownloading(false);
        setPreview(false);
        setStatusBarColor();
    }, [setStatusBarColor]);

    const openDocument = useCallback(async (file: FileInfo) => {
        if (!didCancel && !preview) {
            let path = decodeURIComponent(file.localPath || '');
            let exists = false;
            if (path) {
                exists = await fileExists(path);
            }

            if (!exists) {
                path = getLocalFilePathFromFile(serverUrl, file);
            }

            if (enableSecureFilePreview) {
                if (isPdf(file)) {
                    previewPdf(file, path, theme, onDonePreviewingFile);
                } else {
                    alertOnlyPDFSupported(intl);
                }
                return;
            }

            setPreview(true);
            setStatusBarColor('dark-content');
            FileViewer.open(path!.replace('file://', ''), {
                displayName: decodeURIComponent(file.name),
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
                    deleteAsync(path, {idempotent: true});
                }
            });
        }
    }, [didCancel, preview, enableSecureFilePreview, setStatusBarColor, onDonePreviewingFile, serverUrl, theme, intl]);

    const downloadAndPreviewFile = useCallback(async (file: FileInfo) => {
        setDidCancel(false);
        let path;
        let exists = false;

        try {
            path = decodeURIComponent(file.localPath || '');
            if (path) {
                exists = await fileExists(path);
            }

            if (!exists) {
                path = getLocalFilePathFromFile(serverUrl, file);
                exists = await fileExists(path);
            }

            if (exists) {
                openDocument(file);
            } else {
                setDownloading(true);
                downloadTask.current = downloadFile(serverUrl, file.id!, path!);
                downloadTask.current?.progress?.(setProgress);

                await downloadTask.current;
                setProgress(1);
                openDocument(file);
            }
        } catch (error) {
            if (path) {
                deleteAsync(path, {idempotent: true});
            }
            setDownloading(false);
            setProgress(0);

            if (!isErrorWithMessage(error) || error.message !== 'cancelled') {
                logDebug('error on downloadAndPreviewFile', getFullErrorMessage(error));
                alertDownloadFailed(intl);
            }
        }
    }, [intl, openDocument, serverUrl]);

    const toggleDownloadAndPreview = useCallback((file: FileInfo) => {
        if (downloading && progress < 1) {
            cancelDownload();
        } else if (downloading) {
            setProgress(0);
            cancelDownload();
            setDownloading(false);
        } else {
            downloadAndPreviewFile(file);
        }
    }, [downloading, progress, downloadAndPreviewFile]);

    const cancelDownload = () => {
        setDidCancel(true);
        if (downloadTask.current?.cancel) {
            downloadTask.current.cancel();
        }
    };

    return {
        downloading,
        progress,
        toggleDownloadAndPreview,
    };
};
