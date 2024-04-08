// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {
    View,
    TouchableOpacity,
    Text,
} from 'react-native';

import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import CompassIcon from '../compass_icon';
import ProgressBar from '../progress_bar';

const WHITE_ICON = '#FFFFFF';

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

const AudioFile = () => {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    return (
        <View style={style.audioFileWrapper}>
            <TouchableOpacity style={style.playButton}>
                <CompassIcon
                    name='play'
                    size={24}
                    color={WHITE_ICON}
                />
            </TouchableOpacity>

            <View style={style.progressBar}>
                <ProgressBar
                    progress={0.5}
                    color={theme.buttonBg}
                    withCursor={true}
                />
            </View>

            <Text style={style.timerText}>{'1:30'}</Text>
        </View>
    );
};

export default AudioFile;
