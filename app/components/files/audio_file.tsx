// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {throttle} from 'lodash';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {
    View,
    TouchableOpacity,
    Text,
} from 'react-native';
import Video, {type OnLoadData, type OnProgressData} from 'react-native-video';

import {useTheme} from '@context/theme';
import {useDownloadFileAndPreview} from '@hooks/files';
import {alertDownloadDocumentDisabled} from '@utils/document';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import CompassIcon from '../compass_icon';
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
    const videoRef = useRef<Video>(null);

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
        if (videoRef.current) {
            videoRef.current.seek(0);
        }
        setHasEnded(true);
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
