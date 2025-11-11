// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PasteableTextInput, {type PasteInputRef} from '@mattermost/react-native-paste-input';
import React, {useMemo} from 'react';
import {Platform, type NativeSyntheticEvent, View, type TextInputSelectionChangeEventData} from 'react-native';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme, getKeyboardAppearanceFromTheme} from '@utils/theme';

type Props = {
    testID?: string;
    value: string;
    onChangeText: (text: string) => void;
    onSelectionChange?: (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => void;
    placeholder?: string;
    inputRef?: React.MutableRefObject<PasteInputRef | undefined>;
    onFocus?: () => void;
    onBlur?: () => void;
    expanded?: boolean;
    onEmojiPress?: () => void; // Emoji icon inside text field
}
const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    container: {
        position: 'relative',
    },
    input: {
        color: theme.centerChannelColor,
        fontSize: 15,
        lineHeight: 20,
        paddingHorizontal: 16,
        paddingTop: Platform.select({
            ios: 10,
            android: 12,
        }),
        paddingBottom: Platform.select({
            ios: 10,
            android: 8,
        }),
        paddingRight: 44, // Space for emoji icon inside
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        borderRadius: 24,
        minHeight: 44,
        maxHeight: 120,
    },
    inputExpanded: {
        color: theme.centerChannelColor,
        fontSize: 15,
        lineHeight: 20,
        paddingHorizontal: 16,
        paddingTop: Platform.select({
            ios: 12,
            android: 14,
        }),
        paddingBottom: Platform.select({
            ios: 12,
            android: 10,
        }),
        paddingRight: 44,
        minHeight: 60,
        maxHeight: 140,
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        borderRadius: 24,
    },
    emojiButton: {
        position: 'absolute',
        right: 12,
        top: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 4,
    },
}));

export default function DaakiaInput({
    testID,
    value,
    onChangeText,
    onSelectionChange,
    placeholder = 'Type your message here',
    inputRef,
    onFocus,
    onBlur,
    expanded = false,
    onEmojiPress,
}: Props) {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    const inputStyle = useMemo(() => {
        return expanded ? style.inputExpanded : style.input;
    }, [expanded, style.input, style.inputExpanded]);

    const handlePaste = () => {
        // Handle paste if needed
    };

    return (
        <View style={style.container}>
            <PasteableTextInput
                allowFontScaling={true}
                autoCorrect={true}
                autoFocus={false}
                blurOnSubmit={false}
                contextMenuHidden={false}
                disableFullscreenUI={true}
                keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                multiline={true}
                onBlur={onBlur}
                onChangeText={onChangeText}
                onFocus={onFocus}
                onPaste={handlePaste}
                onSelectionChange={onSelectionChange}
                placeholder={placeholder}
                placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                ref={inputRef}
                smartPunctuation='disable'
                submitBehavior='newline'
                style={inputStyle}
                testID={testID}
                underlineColorAndroid='transparent'
                textContentType='none'
                value={value}
                autoCapitalize='sentences'
                enablesReturnKeyAutomatically={true}
                returnKeyType='default'
                scrollEnabled={true}
                textAlignVertical='top'
            />
            {onEmojiPress && (
                <TouchableWithFeedback
                    testID={`${testID}.emoji_button`}
                    onPress={onEmojiPress}
                    style={style.emojiButton}
                    type='opacity'
                >
                    <CompassIcon
                        name='emoticon-happy-outline'
                        color={changeOpacity(theme.centerChannelColor, 0.64)}
                        size={20}
                    />
                </TouchableWithFeedback>
            )}
        </View>
    );
}
