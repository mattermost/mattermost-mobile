// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {TouchableOpacity, View} from 'react-native';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';

import CompassIcon from '@components/compass_icon';
import {MIC_SIZE} from '@constants/view';
import {useTheme} from '@context/theme';
import {extractFileInfo} from '@utils/file';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import AnimatedMicrophone from './animated_microphone';
import SoundWave from './sound_wave';
import TimeElapsed from './time_elapsed';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    const iconCommon = {
        height: MIC_SIZE,
        width: MIC_SIZE,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
    };

    const round = {
        borderRadius: MIC_SIZE / 2,
        backgroundColor: changeOpacity(theme.buttonBg, 0.12),
    };

    return {
        mainContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-around',
            height: 88,
        },
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

type VoiceInputProps = {
    setRecording: (v: boolean) => void;
    addFiles: (f: FileInfo[]) => void;
    onClose: () => void;
}
const VoiceInput = ({onClose, addFiles, setRecording}: VoiceInputProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const audioRecorderPlayer = useMemo(() => new AudioRecorderPlayer(), []);
    const [time, setTime] = useState('00:00');

    useEffect(() => {
        audioRecorderPlayer.addRecordBackListener((e) => {
            setTime(audioRecorderPlayer.mmss(Math.floor(e.currentPosition / 1000)));
        });
        audioRecorderPlayer.startRecorder(`${Date.now()}.mp3`);
        return () => {
            audioRecorderPlayer.stopRecorder();
            audioRecorderPlayer.removePlayBackListener();
        };
    }, []);

    const accept = useCallback(async () => {
        const url = await audioRecorderPlayer.stopRecorder();
        const fi = await extractFileInfo([{uri: url}]);
        fi[0].is_voice_recording = true;
        addFiles(fi as FileInfo[]);
        setRecording(false);
        onClose();
    }, [onClose]);

    return (
        <View style={styles.mainContainer}>
            <AnimatedMicrophone/>
            <SoundWave/>
            <TimeElapsed timeElapsed={time}/>
            <TouchableOpacity
                style={styles.close}
                onPress={onClose}
            >
                <CompassIcon
                    color={theme.buttonBg}
                    name='close'
                    size={24}
                />
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.check}
                onPress={accept}
            >
                <CompassIcon
                    color={theme.buttonColor}
                    name='check'
                    size={24}
                />
            </TouchableOpacity>
        </View>
    );
};

export default VoiceInput;
