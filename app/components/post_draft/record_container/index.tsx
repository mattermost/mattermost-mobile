// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import SoundWave from './sound_wave';
import TimeElapsed from './time_elapsed';

const MIC_SIZE = 40;

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    const iconCommon = {
        height: MIC_SIZE,
        width: MIC_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
    };

    const round = {
        borderRadius: MIC_SIZE / 2,
        backgroundColor: changeOpacity(theme.buttonBg, 0.12),
    };

    return {
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-around',
        },
        mic: {
            ...iconCommon,
            ...round,
        },
        check: {
            ...iconCommon,
            ...round,
            backgroundColor: theme.buttonBg,
        },
        close: {
            ...iconCommon,
        },
    };
});

const RecordContainer = () => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <View
            style={styles.container}
        >
            <View style={styles.mic}>
                <CompassIcon
                    name='microphone'
                    size={24}
                    color={theme.buttonBg}
                />
            </View>
            <SoundWave/>
            <TimeElapsed/>
            <View style={styles.close}>
                <CompassIcon
                    name='close'
                    size={24}
                    color={theme.buttonBg}
                />
            </View>
            <View style={styles.check}>
                <CompassIcon
                    name='check'
                    size={24}
                    color={theme.buttonColor}
                />
            </View>
        </View>
    );
};

export default RecordContainer;
