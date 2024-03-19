// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {
    StyleSheet,
    View,
    Text,
} from 'react-native';

import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    audioFileWrapper: {
        borderRadius: 5,
        overflow: 'hidden',
    },
    boxPlaceholder: {
        paddingBottom: '100%',
    },
    failed: {
        justifyContent: 'center',
        alignItems: 'center',
        borderColor: changeOpacity(theme.centerChannelColor, 0.2),
        borderRadius: 4,
        borderWidth: 1,
    },
    playContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        ...StyleSheet.absoluteFillObject,
    },
    play: {
        backgroundColor: changeOpacity('#000', 0.16),
        borderRadius: 20,
    },
}));

const AudioFile = () => {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    return (
        <View style={style.audioFileWrapper}>
            <Text>{'Audio'}</Text>
        </View>
    );
};

export default AudioFile;
