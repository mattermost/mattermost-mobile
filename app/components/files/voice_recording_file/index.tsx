// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {StyleSheet, Text, useWindowDimensions, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import PlayBack from '@components/files/voice_recording_file/playback';
import {MIC_SIZE, VOICE_MESSAGE_CARD_RATIO} from '@constants/view';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

//i18n
const VOICE_MESSAGE = 'Voice message';
const UPLOADING_TEXT = 'Uploading..(0%)';

type Props = {
    file: FileInfo;
    uploading: boolean;
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            flexDirection: 'row',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: changeOpacity(theme.centerChannelColor, 0.56),
            shadowColor: '#000',
            shadowOpacity: 0.08,
            shadowRadius: 6,
            shadowOffset: {
                width: 0,
                height: 3,
            },
            alignItems: 'center',
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
        playBackContainer: {
            flexDirection: 'row',
            alignItems: 'center',
        },
    };
});

const VoiceRecordingFile = ({file, uploading}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const dimensions = useWindowDimensions();
    const isVoiceMessage = file.is_voice_recording;

    const voiceStyle = useMemo(() => {
        return {
            width: dimensions.width * VOICE_MESSAGE_CARD_RATIO,
        };
    }, [dimensions.width]);

    const getUploadingView = useCallback(() => {
        return (
            <>
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
            </>
        );
    }, [uploading]);

    return (
        <View
            style={[
                styles.container,
                isVoiceMessage && voiceStyle,
            ]}
        >
            {uploading ? getUploadingView() : <PlayBack/>}
        </View>
    );
};

export default VoiceRecordingFile;
