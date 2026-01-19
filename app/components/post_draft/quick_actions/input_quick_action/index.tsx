// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {ICON_SIZE} from '@constants/post_draft';
import {useKeyboardAnimationContext} from '@context/keyboard_animation';
import {useTheme} from '@context/theme';
import {useFocusAfterEmojiDismiss} from '@hooks/useFocusAfterEmojiDismiss';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    testID?: string;
    disabled?: boolean;
    inputType: 'at' | 'slash';
    updateValue: React.Dispatch<React.SetStateAction<string>>;
    focus: () => void;
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        disabled: {
            tintColor: changeOpacity(theme.centerChannelColor, 0.16),
        },
        icon: {
            alignItems: 'center',
            justifyContent: 'center',
            padding: 10,
        },
    };
});

export default function InputQuickAction({
    testID,
    disabled,
    inputType,
    updateValue,
    focus,
}: Props) {
    const theme = useTheme();
    const {inputRef, cursorPositionRef, updateCursorPosition} = useKeyboardAnimationContext();

    // Use hook to handle focus after emoji picker dismissal
    const {focus: focusWithEmojiDismiss} = useFocusAfterEmojiDismiss(inputRef, focus);

    const onPress = useCallback(() => {
        if (cursorPositionRef && updateCursorPosition) {
            const currentCursorPosition = cursorPositionRef.current;

            updateValue((v) => {
                if (inputType === 'at') {
                    let insertedText = '@';
                    const charBeforeCursor = currentCursorPosition > 0 ? v[currentCursorPosition - 1] : '';

                    if (currentCursorPosition === v.length && currentCursorPosition > 0 && charBeforeCursor !== ' ') {
                        insertedText = ' @';
                    }

                    const newValue = v.slice(0, currentCursorPosition) + insertedText + v.slice(currentCursorPosition);
                    const newCursorPosition = currentCursorPosition + insertedText.length;

                    cursorPositionRef.current = newCursorPosition;
                    updateCursorPosition(newCursorPosition);

                    return newValue;
                }

                const newValue = v.slice(0, currentCursorPosition) + '/' + v.slice(currentCursorPosition);
                const newCursorPosition = currentCursorPosition + 1;

                cursorPositionRef.current = newCursorPosition;
                updateCursorPosition(newCursorPosition);

                return newValue;
            });
        } else {
            updateValue((v) => {
                if (inputType === 'at') {
                    if (v.length > 0 && !v.endsWith(' ')) {
                        return `${v} @`;
                    }
                    return `${v}@`;
                }
                return '/';
            });
        }
        focusWithEmojiDismiss();
    }, [inputType, updateValue, focusWithEmojiDismiss, cursorPositionRef, updateCursorPosition]);

    const actionTestID = disabled ? `${testID}.disabled` : testID;
    const style = getStyleSheet(theme);
    const iconName = inputType === 'at' ? inputType : 'slash-forward-box-outline';
    const iconColor = disabled ? changeOpacity(theme.centerChannelColor, 0.16) : changeOpacity(theme.centerChannelColor, 0.64);

    return (
        <TouchableWithFeedback
            testID={actionTestID}
            disabled={disabled}
            onPress={onPress}
            style={style.icon}
            type={'opacity'}
        >
            <CompassIcon
                name={iconName}
                color={iconColor}
                size={ICON_SIZE}
            />
        </TouchableWithFeedback>
    );
}
