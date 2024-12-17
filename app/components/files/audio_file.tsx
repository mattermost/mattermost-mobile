// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {throttle} from 'lodash';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {
    View,
    TouchableOpacity,
    Text,
    TouchableWithoutFeedback,
} from 'react-native';
import Video, {type OnLoadData, type OnProgressData, type VideoRef} from 'react-native-video';

import {useTheme} from '@context/theme';
import {useDownloadFileAndPreview} from '@hooks/files';
import {alertDownloadDocumentDisabled} from '@utils/document';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import CompassIcon from '../compass_icon';
import FormattedText from '../formatted_text';
import ProgressBar from '../progress_bar';

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
    downloadIcon: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
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
    const intl = useIntl();
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const [hasPaused, setHasPaused] = useState<boolean>(true);
    const [hasError, setHasError] = useState<boolean>(false);
    const [hasEnded, setHasEnded] = useState<boolean>(false);
    const [progress, setProgress] = useState<number>(0);
    const [timeInMinutes, setTimeInMinutes] = useState<string>('0:00');
    const [duration, setDuration] = useState<number>(0);
    const videoRef = useRef<VideoRef>(null);

    useEffect(() => {
        if (hasEnded) {
            const timer = setTimeout(() => {
                setHasPaused(true);
                setProgress(0);
                setHasEnded(false);
            }, 100);

            return () => clearTimeout(timer);
        }

        return () => null;
    }, [hasEnded]);

    const source = useMemo(() => ({uri: file.uri}), [file.uri]);

    const {toggleDownloadAndPreview} = useDownloadFileAndPreview();

    const onPlayPress = () => {
        setHasPaused(!hasPaused);
    };

    const onDownloadPress = async () => {
        if (!canDownloadFiles) {
            alertDownloadDocumentDisabled(intl);
            return;
        }

        toggleDownloadAndPreview(file);
    };

    const loadTimeInMinutes = (timeInSeconds: number) => {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        setTimeInMinutes(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    const onLoad = (loadData: OnLoadData) => {
        loadTimeInMinutes(loadData.duration);
        setDuration(loadData.duration);
    };

    const onProgress = (progressData: OnProgressData) => {
        if (hasPaused) {
            return;
        }
        const {currentTime, playableDuration} = progressData;
        setProgress(currentTime / playableDuration);
        throttle(() => loadTimeInMinutes(currentTime), 1000)();
    };

    const onEnd = () => {
        if (videoRef.current) {
            videoRef.current.seek(0);
        }
        setHasEnded(true);
    };

    const onError = () => {
        setHasError(true);
    };

    const onSeek = (seekPosition: number) => {
        if (videoRef.current && duration > 0) {
            const newTime = seekPosition * duration;
            videoRef.current.seek(newTime);
            setProgress(seekPosition);
            throttle(() => loadTimeInMinutes(newTime), 100)();
        }
    };

    const onAudioFocusChanged = ({hasAudioFocus}: {hasAudioFocus: boolean}) => {
        if (!hasAudioFocus) {
            setHasPaused(true);
        }
    };

    if (hasError) {
        return (
            <FormattedText
                id={'audio.loading_error'}
                defaultMessage={'Error loading audio.'}
            />
        );
    }

    return (
        <TouchableWithoutFeedback
            onPress={(e) => {
                e.stopPropagation();
            }}
        >
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
                </TouchableOpacity>

                <Video
                    ref={videoRef}
                    source={source}
                    paused={hasPaused}
                    onLoad={onLoad}
                    onProgress={onProgress}
                    onError={onError}
                    onEnd={onEnd}
                    onAudioFocusChanged={onAudioFocusChanged}
                />

                <View style={style.progressBar}>
                    <ProgressBar
                        progress={progress}
                        color={theme.buttonBg}
                        withCursor={true}
                        onSeek={onSeek}
                    />
                </View>

                <Text style={style.timerText}>{timeInMinutes}</Text>

                <TouchableOpacity
                    onPress={onDownloadPress}
                >
                    <CompassIcon
                        name='download-outline'
                        size={24}
                        style={style.downloadIcon}
                    />
                </TouchableOpacity>
            </View>
        </TouchableWithoutFeedback>
    );
};

export default AudioFile;
