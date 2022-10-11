// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const VOICE_MESSAGE = 'Voice message';
const UPLOADING_TEXT = 'Uploading..(0%)';
const MIC_SIZE = 40;

type Props = {
    file: FileInfo;
    onClose: () => void;
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flexDirection: 'row',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: changeOpacity(theme.centerChannelColor, 0.56),

            //fix-me shadow
            shadowColor: '#000',
            shadowOpacity: 0.08,
            shadowRadius: 6,
            shadowOffset: {
                width: 0,
                height: 3,
            },
        },
        centerContainer: {
            marginLeft: 12,
        },
        title: {
            color: theme.centerChannelColor,
            ...typography('Heading', 200),
        },
        uploading: {
            color: changeOpacity(theme.centerChannelColor, 0.56),
            ...typography('Body', 75),
        },
        close: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.56),
        },
        mic: {
            borderRadius: MIC_SIZE / 2,
            backgroundColor: changeOpacity(theme.buttonBg, 0.12),
            height: MIC_SIZE,
            width: MIC_SIZE,
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 12,
        },
    };
});

const VoiceRecordingFile = ({file, onClose}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <View style={styles.container}>
            <View
                style={styles.mic}
            >
                <CompassIcon
                    name='microphone'
                    size={24}
                    color={theme.buttonBg}
                />
            </View>
            <View style={styles.centerContainer}>
                <Text style={styles.title}>{VOICE_MESSAGE}</Text>
                <Text style={styles.uploading}>{UPLOADING_TEXT}</Text>
            </View>
        </View>
    );
};

export default VoiceRecordingFile;
