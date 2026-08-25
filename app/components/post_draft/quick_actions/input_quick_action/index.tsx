// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {ICON_SIZE} from '@constants/post_draft';
import {useKeyboardState} from '@context/keyboard_state';
import {useTheme} from '@context/theme';
import {useFocusAfterEmojiDismiss} from '@hooks/use_focus_after_emoji_dismiss';
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
    const {inputRef, getCursorPosition, setCursorPosition, updateCursorPosition} = useKeyboardState();

    // Use hook to handle focus after emoji picker dismissal
    const {focus: focusWithEmojiDismiss} = useFocusAfterEmojiDismiss(inputRef, focus);

    const onPress = useCallback(() => {
        if (getCursorPosition && updateCursorPosition) {
            const currentCursorPosition = getCursorPosition();

            updateValue((v) => {
                let newCursorPosition: number;
                let newValue: string;

                if (inputType === 'at') {
                    let insertedText = '@';
                    const charBeforeCursor = currentCursorPosition > 0 ? v[currentCursorPosition - 1] : '';

                    if (currentCursorPosition === v.length && currentCursorPosition > 0 && charBeforeCursor !== ' ') {
                        insertedText = ' @';
                    }

                    newValue = v.slice(0, currentCursorPosition) + insertedText + v.slice(currentCursorPosition);
                    newCursorPosition = currentCursorPosition + insertedText.length;
                } else {
                    newValue = v.slice(0, currentCursorPosition) + '/' + v.slice(currentCursorPosition);
                    newCursorPosition = currentCursorPosition + 1;
                }

                setCursorPosition(newCursorPosition);
                updateCursorPosition(newCursorPosition);

                // On Android the controlled PasteInput doesn't reposition the native cursor
                // after a value change unless we explicitly call setSelection.
                inputRef.current?.setSelection(newCursorPosition, newCursorPosition);

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

    // inputRef is a stable MutableRefObject from useKeyboardState — its identity never changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inputType, updateValue, focusWithEmojiDismiss, getCursorPosition, setCursorPosition, updateCursorPosition]);

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
