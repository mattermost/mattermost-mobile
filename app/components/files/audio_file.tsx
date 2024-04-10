// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo, useRef, useState} from 'react';
import {
    View,
    TouchableOpacity,
    Text,
} from 'react-native';
import Video, {type OnProgressData} from 'react-native-video';

import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import CompassIcon from '../compass_icon';
import ProgressBar from '../progress_bar';

const WHITE_ICON = '#FFFFFF';

type AudioFileProps = {
    file: FileInfo;
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
        gap: 16,
        alignItems: 'center',
    },
    playButton: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.buttonBg,
        borderRadius: 100,
        width: 42,
        height: 42,
    },
    progressBar: {
        flex: 1,
    },
    timerText: {
        position: 'absolute',
        top: 8,
        right: 16,
        ...typography('Body', 75, 'SemiBold'),
    },
}));

const AudioFile = ({file}: AudioFileProps) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const [hasPaused, setHasPaused] = useState<boolean>(true);
    const [hasError, setHasError] = useState<boolean>(false);
    const [progress, setProgress] = useState<number>(0);
    const videoRef = useRef<Video>(null);

    const source = useMemo(() => ({uri: file.uri}), [file.uri]);

    const onPlayPress = () => {
        setHasPaused(!hasPaused);
    };

    const onProgress = (progressData: OnProgressData) => {
        const {currentTime, playableDuration} = progressData;
        setProgress(currentTime / playableDuration);
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
                    color={WHITE_ICON}
                />
            </TouchableOpacity>

            <Video
                ref={videoRef}
                source={source}
                audioOnly={true}
                paused={hasPaused}
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

            <Text style={style.timerText}>{'1:30'}</Text>
        </View>
    );
};

export default AudioFile;
