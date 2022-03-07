// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {forwardRef, useCallback, useImperativeHandle, useRef} from 'react';
import {useIntl} from 'react-intl';
import {KeyboardType, Platform, TextInput, useWindowDimensions, View} from 'react-native';

import {useTheme} from '@context/theme';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    input: {
        color: theme.centerChannelColor,
        padding: 15,
        textAlignVertical: 'top',
        ...typography(),
    },
    inputContainer: {
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderTopColor: changeOpacity(theme.centerChannelColor, 0.1),
        borderBottomColor: changeOpacity(theme.centerChannelColor, 0.1),
        backgroundColor: theme.centerChannelBg,
        marginTop: 2,
    },
}));

const HEIGHT_DIFF = Platform.select({android: 40, default: 30});

export type PostInputRef = {
    focus: () => void;
}
type PostInputProps = {
    keyboardType: KeyboardType;
    message: string;
    hasError: boolean;
    onTextSelectionChange: (curPos: number) => void;
    onChangeText: (text: string) => void;
}
const EditPostInput = forwardRef<PostInputRef, PostInputProps>(({
    keyboardType, message, onChangeText, onTextSelectionChange, hasError,
}: PostInputProps, ref) => {
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const {height} = useWindowDimensions();
    const textInputHeight = (height / 2) - HEIGHT_DIFF;

    const inputRef = useRef<TextInput>(null);

    useImperativeHandle(ref, () => ({ //fixme:  can this be removed ??
        focus: () => inputRef.current?.focus(),
    }), [inputRef]);

    const onSelectionChange = useCallback((event) => {
        const curPos = event.nativeEvent.selection.end;
        onTextSelectionChange(curPos);
    }, [onTextSelectionChange]);

    return (
        <View
            style={[
                styles.inputContainer,
                hasError && {marginTop: 0},
                {height: textInputHeight},
            ]}
        >
            <TextInput
                autoFocus={true}
                blurOnSubmit={false}
                disableFullscreenUI={true}
                keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                keyboardType={keyboardType}
                multiline={true}
                numberOfLines={10}
                onChangeText={onChangeText}
                onSelectionChange={onSelectionChange}
                placeholder={intl.formatMessage({id: 'edit_post.editPost', defaultMessage: 'Edit the post...'})}
                placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.4)}
                style={[styles.input, {height: textInputHeight}]}
                testID='edit_post.message.input'
                underlineColorAndroid='transparent'
                value={message}
            />
        </View>
    );
});

EditPostInput.displayName = 'EditPostInput';

export default EditPostInput;
