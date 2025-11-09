// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {ICON_SIZE} from '@constants/post_draft';
import {EMOJI_PICKER} from '@constants/screens';
import {useTheme} from '@context/theme';
import {openAsBottomSheet} from '@screens/navigation';
import {getEmojiByName} from '@utils/emoji/helpers';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    testID?: string;
    disabled?: boolean;
    value: string;
    updateValue: (value: string) => void;
    cursorPosition: number;
    updateCursorPosition: (position: number) => void;
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
            padding: 8,
            borderRadius: 8,
            minWidth: 36,
            minHeight: 36,
        },
    };
});

export default function EmojiQuickAction({
    testID,
    disabled,
    value,
    updateValue,
    cursorPosition,
    updateCursorPosition,
    focus,
}: Props) {
    const theme = useTheme();
    const intl = useIntl();

    const handleEmojiPress = useCallback((emojiName: string) => {
        // Convert emoji name to actual emoji character
        // For standard emojis, get the unicode character
        // For custom emojis, use :name: format
        const emojiData = getEmojiByName(emojiName, []);
        let emojiChar: string;

        if (emojiData?.image && emojiData.category !== 'custom') {
            // Standard emoji: convert unicode code points to actual emoji character
            const codeArray: string[] = emojiData.image.split('-');
            emojiChar = codeArray.reduce((acc, c) => {
                return acc + String.fromCodePoint(parseInt(c, 16));
            }, '');
        } else {
            // Custom emoji: use :name: format
            emojiChar = `:${emojiName}:`;
        }

        // Insert emoji at cursor position
        const beforeCursor = value.substring(0, cursorPosition);
        const afterCursor = value.substring(cursorPosition);
        const newValue = `${beforeCursor}${emojiChar}${afterCursor}`;
        const newCursorPosition = cursorPosition + emojiChar.length;

        updateValue(newValue);
        updateCursorPosition(newCursorPosition);
        focus();
    }, [value, cursorPosition, updateValue, updateCursorPosition, focus]);

    const onPress = useCallback(() => {
        openAsBottomSheet({
            closeButtonId: 'close-emoji-picker',
            screen: EMOJI_PICKER,
            theme,
            title: intl.formatMessage({id: 'emoji_picker.default', defaultMessage: 'Emoji'}),
            props: {
                onEmojiPress: handleEmojiPress,
            },
        });
    }, [theme, intl, handleEmojiPress]);

    const actionTestID = disabled ? `${testID}.disabled` : testID;
    const style = getStyleSheet(theme);
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
                name='emoticon-happy-outline'
                color={iconColor}
                size={ICON_SIZE}
            />
        </TouchableWithFeedback>
    );
}

