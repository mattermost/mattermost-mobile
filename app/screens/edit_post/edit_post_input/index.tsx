// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {forwardRef, useCallback, useImperativeHandle, useMemo, useRef} from 'react';
import {useIntl} from 'react-intl';
import {KeyboardType, NativeSyntheticEvent, Platform, TextInput, TextInputSelectionChangeEventData, useWindowDimensions, View} from 'react-native';

import {useTheme} from '@context/theme';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    input: {
        color: theme.centerChannelColor,
        padding: 15,
        textAlignVertical: 'top',
        ...typography('Body', 200),
    },
    inputContainer: {
        backgroundColor: theme.centerChannelBg,
        marginTop: 2,
    },
}));

const HEIGHT_DIFF = Platform.select({android: 40, default: 30});

export type EditPostInputRef = {
    focus: () => void;
}

type PostInputProps = {
    keyboardType: KeyboardType;
    message: string;
    hasError: boolean;
    onTextSelectionChange: (curPos: number) => void;
    onChangeText: (text: string) => void;
}

const EditPostInput = forwardRef<EditPostInputRef, PostInputProps>(({
    keyboardType, message, onChangeText, onTextSelectionChange, hasError,
}: PostInputProps, ref) => {
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const {height} = useWindowDimensions();
    const textInputHeight = (height / 2) - HEIGHT_DIFF;

    const inputRef = useRef<TextInput>(null);

    const inputStyle = useMemo(() => {
        return [styles.input, {height: textInputHeight}];
    }, [textInputHeight, styles]);

    const onSelectionChange = useCallback((event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
        const curPos = event.nativeEvent.selection.end;
        onTextSelectionChange(curPos);
    }, [onTextSelectionChange]);

    const containerStyle = useMemo(() => [
        styles.inputContainer,
        hasError && {marginTop: 0},
        {height: textInputHeight},
    ], [styles, textInputHeight]);

    useImperativeHandle(ref, () => ({
        focus: () => inputRef.current?.focus(),
    }), [inputRef.current]);

    return (
        <View style={containerStyle}>
            <TextInput
                ref={inputRef}
                blurOnSubmit={false}
                disableFullscreenUI={true}
                keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                keyboardType={keyboardType}
                multiline={true}
                onChangeText={onChangeText}
                onSelectionChange={onSelectionChange}
                placeholder={intl.formatMessage({id: 'edit_post.editPost', defaultMessage: 'Edit the post...'})}
                placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.4)}
                style={inputStyle}
                testID='edit_post.message.input'
                underlineColorAndroid='transparent'
                value={message}
            />
        </View>
    );
});

EditPostInput.displayName = 'EditPostInput';

export default EditPostInput;
