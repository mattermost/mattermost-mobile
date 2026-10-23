// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet} from 'react-native';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {ICON_SIZE} from '@constants/post_draft';
import {useKeyboardState} from '@context/keyboard_state';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {requestMicrophonePermission} from '@utils/permission';
import {changeOpacity} from '@utils/theme';

import type {QuickActionVoiceProps} from '@typings/components/post_draft_quick_action';

const style = StyleSheet.create({
    icon: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
    },
});

export default function VoiceQuickAction({
    disabled,
    onStartRecording,
    testID = '',
}: QuickActionVoiceProps) {
    const intl = useIntl();
    const theme = useTheme();
    const {blurAndDismissKeyboard} = useKeyboardState();

    const handlePress = usePreventDoubleTap(useCallback(async () => {
        const granted = await requestMicrophonePermission(intl);
        if (!granted) {
            return;
        }

        await blurAndDismissKeyboard();
        onStartRecording();
    }, [intl, blurAndDismissKeyboard, onStartRecording]));

    const actionTestID = disabled ? `${testID}.disabled` : testID;
    const color = disabled ? changeOpacity(theme.centerChannelColor, 0.16) : changeOpacity(theme.centerChannelColor, 0.64);

    return (
        <TouchableWithFeedback
            testID={actionTestID}
            disabled={disabled}
            onPress={handlePress}
            style={style.icon}
            type={'opacity'}
            accessibilityRole='button'
            accessibilityLabel={intl.formatMessage({
                id: 'mobile.voice_note.record',
                defaultMessage: 'Record a voice note',
            })}
        >
            <CompassIcon
                color={color}
                name='microphone-outline'
                size={ICON_SIZE}
            />
        </TouchableWithFeedback>
    );
}
