// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {forwardRef, useCallback, useImperativeHandle, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {KeyboardType, Platform, TextInput, useWindowDimensions, View} from 'react-native';

import AutoComplete from '@components/autocomplete';
import {LIST_BOTTOM} from '@constants/autocomplete';
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

export type PostInputRef = {
    focus: () => void;
}
type PostInputProps = {
    keyboardType: KeyboardType;
    message: string;
    channelId: string;
    rootId: string;
    hasFilesAttached: boolean;
    hasError: boolean;
    onTextSelectionChange: (curPos: number) => void;
    onChangeText: (text: string) => void;
}
const PostTextInput = forwardRef<PostInputRef, PostInputProps>(({
    keyboardType, message, onChangeText, onTextSelectionChange, hasError,
    channelId, rootId, hasFilesAttached,
}: PostInputProps, ref) => {
    const intl = useIntl();
    const {height} = useWindowDimensions();
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const inputRef = useRef<TextInput>(null);
    const [cursorPosition, setCursorPosition] = useState(0);
    const [textInputTop, setTextInputTop] = useState(0);

    useImperativeHandle(ref, () => ({ //fixme:  can this be removed ??
        focus: () => inputRef.current?.focus(),
    }), [inputRef]);

    const baseHeight = (height / 2) - 30;
    const textInputHeight = Platform.select({android: baseHeight - 10, default: baseHeight});

    const onSelectionChange = useCallback((event) => {
        const curPos = event.nativeEvent.selection.end;
        onTextSelectionChange(curPos);
        setCursorPosition(curPos);
    }, [onTextSelectionChange]);

    const onContentSizeChange = useCallback(({nativeEvent: {contentSize: {height: contentHeight}}}) => {
        const quaterTextInputHeight = textInputHeight / 4;
        let top: number;
        console.log('>>>  contentHeight', {contentHeight});

        if (contentHeight < quaterTextInputHeight) {
            top = contentHeight - (LIST_BOTTOM) - 20;
            console.log(' SMALLER quaterTextInputHeight', {contentHeight, top, textInputHeight});
            setTextInputTop(-LIST_BOTTOM - 20);
        } else {
            top = -contentHeight - LIST_BOTTOM;
            console.log('GREATER quaterTextInputHeight', {contentHeight, top, textInputHeight});
            setTextInputTop(0);
        }
    }, []);

    return (
        <View
            style={[
                styles.inputContainer,
                {
                    height: textInputHeight,
                    backgroundColor: 'red',
                },
                hasError && {marginTop: 0},
            ]}
        >
            <TextInput

                // onContentSizeChange={onContentSizeChange}
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
            <AutoComplete
                channelId={channelId}
                hasFilesAttached={hasFilesAttached}
                nestedScrollEnabled={true}
                rootId={rootId}
                updateValue={onChangeText}
                value={message}
                cursorPosition={cursorPosition}
                postInputTop={0}
            />
        </View>
    );
});

PostTextInput.displayName = 'PostTextInput';

export default PostTextInput;
