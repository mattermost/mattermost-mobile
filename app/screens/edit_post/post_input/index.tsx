// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
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

type Props = {
    keyboardType: KeyboardType;
    message: string;
    hasError: boolean;
    onPostSelectionChange: (curPos: number) => void;
    onChangeText: (text: string) => void;
}
const PostInput = ({keyboardType, message, onChangeText, onPostSelectionChange, hasError}: Props) => {
    const theme = useTheme();
    const intl = useIntl();
    const {height} = useWindowDimensions();
    const baseHeight = (height / 2) - 30;

    const styles = getStyleSheet(theme);
    const placeholder = intl.formatMessage({id: 'edit_post.editPost', defaultMessage: 'Edit the post...'});
    const inputHeight = Platform.select({
        android: baseHeight - 10,
        ios: baseHeight,
    });

    const onSelectionChange = useCallback((event) => {
        onPostSelectionChange(event.nativeEvent.selection.end);
    }, [onPostSelectionChange]);

    return (
        <View style={[styles.inputContainer, {height}, hasError && {marginTop: 0}]}>
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
                placeholder={placeholder}
                placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.4)}
                style={[styles.input, {inputHeight}]}
                testID='edit_post.message.input'
                underlineColorAndroid='transparent'
                value={message}
            />
        </View>
    );
};

export default PostInput;
