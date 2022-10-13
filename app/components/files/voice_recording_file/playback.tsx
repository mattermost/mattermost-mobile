// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState} from 'react';
import {TouchableOpacity, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import SoundWave from '@components/post_draft/draft_input/voice_input/sound_wave';
import TimeElapsed from '@components/post_draft/draft_input/voice_input/time_elapsed';
import {MIC_SIZE} from '@constants/view';
import {useTheme} from '@context/theme';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        mic: {
            borderRadius: MIC_SIZE / 2,
            backgroundColor: changeOpacity(theme.buttonBg, 0.12),
            height: MIC_SIZE,
            width: MIC_SIZE,
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 12,
        },
        playBackContainer: {
            flexDirection: 'row',
            alignItems: 'center',
        },
    };
});
const PlayBack = () => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const [playing, setPlaying] = useState(false);

    const play = preventDoubleTap(() => {
        return setPlaying((p) => !p);
    });

    return (
        <View
            style={styles.playBackContainer}
        >
            <TouchableOpacity
                style={styles.mic}
                onPress={play}
            >
                <CompassIcon
                    color={theme.buttonBg}
                    name='play'
                    size={24}
                />
            </TouchableOpacity>
            <SoundWave animating={playing}/>
            <TimeElapsed/>
        </View>
    );
};

export default PlayBack;
