// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {StyleSheet} from 'react-native';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {isAndroidEdgeToEdge} from '@constants/device';
import {ICON_SIZE} from '@constants/post_draft';
import {useKeyboardState} from '@context/keyboard_state';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {changeOpacity} from '@utils/theme';

type Props = {
    testID?: string;
    disabled?: boolean;
};

const style = StyleSheet.create({
    icon: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
    },
});

export default function EmojiQuickAction({
    testID,
    disabled,
}: Props) {
    const theme = useTheme();
    const {inputRef, stateContext, stateMachine, showInputAccessoryView, setShowInputAccessoryView} = useKeyboardState();
    const {isEmojiPickerTransition} = stateContext;

    const handleButtonPress = usePreventDoubleTap(useCallback(async () => {
        // Prevent opening if already showing
        if (disabled || showInputAccessoryView) {
            return;
        }

        setShowInputAccessoryView(true);
        isEmojiPickerTransition.value = true;

        stateMachine.onUserOpenEmoji();
        if (isAndroidEdgeToEdge) {
            requestAnimationFrame(() => {
                inputRef.current?.blur();
            });
        } else {
            inputRef.current?.blur();
        }

        // Shared values don't need to be in dependencies - they're stable references
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [disabled, showInputAccessoryView, setShowInputAccessoryView]));

    const actionTestID = disabled ? `${testID}.disabled` : testID;
    const color = disabled ? changeOpacity(theme.centerChannelColor, 0.16) : changeOpacity(theme.centerChannelColor, 0.64);

    return (
        <TouchableWithFeedback
            testID={actionTestID}
            disabled={disabled}
            onPress={handleButtonPress}
            style={style.icon}
            type={'opacity'}
        >
            <CompassIcon
                color={color}
                name='emoticon-happy-outline'
                size={ICON_SIZE}
            />
        </TouchableWithFeedback>
    );
}

