// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {throttle} from 'lodash';
import React, {useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {
    View,
    TouchableOpacity,
    Text,
} from 'react-native';
import FileViewer from 'react-native-file-viewer';
import FileSystem from 'react-native-fs';
import Video, {type OnLoadData, type OnProgressData} from 'react-native-video';

import {DOWNLOAD_TIMEOUT} from '@constants/network';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import NetworkManager from '@managers/network_manager';
import {alertDownloadDocumentDisabled, alertDownloadFailed, alertFailedToOpenDocument} from '@utils/document';
import {getFullErrorMessage, isErrorWithMessage} from '@utils/errors';
import {fileExists, getLocalFilePathFromFile} from '@utils/file';
import {emptyFunction} from '@utils/general';
import {logDebug} from '@utils/log';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import CompassIcon from '../compass_icon';
import ProgressBar from '../progress_bar';

import type {Client} from '@client/rest';
import type {ClientResponse, ProgressPromise} from '@mattermost/react-native-network-client';

type Props = {
    file: FileInfo;
    canDownloadFiles: boolean;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    audioFileWrapper: {
        position: 'relative',
        borderColor: changeOpacity(theme.centerChannelColor, 0.2),
        borderRadius: 4,
        borderWidth: 1,
        padding: 12,
        overflow: 'hidden',
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
    },
    playButton: {
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: changeOpacity(theme.buttonBg, 0.12),
        borderRadius: 100,
        width: 40,
        height: 40,
    },
    playIcon: {
        color: theme.buttonBg,
    },
    progressBar: {
        flex: 1,
    },
    timerText: {
        color: theme.centerChannelColor,
        ...typography('Body', 75, 'SemiBold'),
    },
}));

const AudioFile = ({file, canDownloadFiles}: Props) => {
    const serverUrl = useServerUrl();
    const intl = useIntl();
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const [hasPaused, setHasPaused] = useState<boolean>(true);
    const [hasError, setHasError] = useState<boolean>(false);
    const [progress, setProgress] = useState<number>(0);
    const [timeInMinutes, setTimeInMinutes] = useState<string>('0:00');
    const videoRef = useRef<Video>(null);

    const source = useMemo(() => ({uri: file.uri}), [file.uri]);

    const [preview, setPreview] = useState(false);
    const [didCancel, setDidCancel] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    let client: Client | undefined;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch {
        // do nothing
    }
    const downloadTask = useRef<ProgressPromise<ClientResponse>>();

    const onPlayPress = () => {
        setHasPaused(!hasPaused);
    };

    const openDocument = () => {
        if (!didCancel && !preview) {
            const path = getLocalFilePathFromFile(serverUrl, file);
            setPreview(true);
            FileViewer.open(path!, {
                displayName: file.name,
                onDismiss: onDonePreviewingFile,
                showOpenWithDialog: true,
                showAppsSuggestions: true,
            }).then(() => {
                setDownloading(false);
                setDownloadProgress(0);
            }).catch(() => {
                alertFailedToOpenDocument(file, intl);
                onDonePreviewingFile();

                if (path) {
                    FileSystem.unlink(path).catch(emptyFunction);
                }
            });
        }
    };

    const onDonePreviewingFile = () => {
        setDownloadProgress(0);
        setDownloading(false);
        setPreview(false);
    };

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
                downloadTask.current?.progress?.(setDownloadProgress);

                await downloadTask.current;
                setDownloadProgress(1);
                openDocument();
            }
        } catch (error) {
            if (path) {
                FileSystem.unlink(path).catch(emptyFunction);
            }
            setDownloading(false);
            setDownloadProgress(0);

            if (!isErrorWithMessage(error) || error.message !== 'cancelled') {
                logDebug('error on downloadAndPreviewFile', getFullErrorMessage(error));
                alertDownloadFailed(intl);
            }
        }
    };

    const onDownloadPress = async () => {
        if (!canDownloadFiles) {
            alertDownloadDocumentDisabled(intl);
            return;
        }

        if (downloading && progress < 1) {
            cancelDownload();
        } else if (downloading) {
            setDownloadProgress(0);
            setDidCancel(true);
            setDownloading(false);
        } else {
            downloadAndPreviewFile();
        }
    };

    const loadTimeInMinutes = throttle((timeInSeconds: number) => {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        setTimeInMinutes(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);

    const onLoad = (loadData: OnLoadData) => {
        loadTimeInMinutes(loadData.duration);
    };

    const onProgress = (progressData: OnProgressData) => {
        const {currentTime, playableDuration} = progressData;
        setProgress(currentTime / playableDuration);
        loadTimeInMinutes(currentTime);
    };

    const onEnd = () => {
        setHasPaused(true);
        setProgress(0);
        if (videoRef.current) {
            videoRef.current.seek(0);
        }
    };

    const onError = () => {
        setHasError(true);
    };

    if (hasError) {
        return <Text>{'Error loading audio'}</Text>;
    }

    return (
        <View style={style.audioFileWrapper}>
            <TouchableOpacity
                style={style.playButton}
                onPress={onPlayPress}
            >
                <CompassIcon
                    name={hasPaused ? 'play' : 'pause'}
                    size={24}
                    style={style.playIcon}
                />

                <ProgressBar
                    progress={downloadProgress || 0.1}
                    color={theme.buttonBg}
                />
            </TouchableOpacity>

            <Video
                ref={videoRef}
                source={source}
                audioOnly={true}
                paused={hasPaused}
                onLoad={onLoad}
                onProgress={onProgress}
                onError={onError}
                onEnd={onEnd}
            />

            <View style={style.progressBar}>
                <ProgressBar
                    progress={progress}
                    color={theme.buttonBg}
                    withCursor={true}
                />
            </View>

            <Text style={style.timerText}>{timeInMinutes}</Text>

            <TouchableOpacity
                onPress={onDownloadPress}
            >
                <CompassIcon
                    name='download-outline'
                    size={24}
                />
            </TouchableOpacity>
        </View>
    );
};

export default AudioFile;
