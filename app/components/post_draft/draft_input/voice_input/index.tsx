// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect} from 'react';
import {TouchableOpacity, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {MIC_SIZE} from '@constants/view';
import {useTheme} from '@context/theme';
import {extractFileInfo} from '@utils/file';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import AnimatedMicrophone from './animated_microphone';
import SoundWave from './sound_wave';
import TimeElapsed from './time_elapsed';

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

    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const record = async () => {
            const url = ''; //await recorder.current?.stopRecorder()
            const fi = await extractFileInfo([{uri: url}]);
            fi[0].is_voice_recording = true;
            addFiles(fi as FileInfo[]);
            setRecording(false);
        };

        //todo: to start recording as soon as this screen shows up
        // record();
    }, []);

    return (
        <View style={styles.mainContainer}>
            <AnimatedMicrophone/>
            <SoundWave/>
            <TimeElapsed/>
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
                onPress={onClose} // to be fixed when wiring is completed
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
