// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {KeyboardType, NativeSyntheticEvent, Platform, TextInput, TextInputSelectionChangeEventData, useWindowDimensions, View} from 'react-native';

import {useTheme} from '@context/theme';
import {t} from '@i18n';
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
    onSelectionChange: (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => void;
    onChangeText: (text: string) => void;
}
const PostInput = ({keyboardType, message, onChangeText, onSelectionChange, hasError}: Props) => {
    const theme = useTheme();
    const intl = useIntl();
    const {height} = useWindowDimensions();
    const baseHeight = (height / 2) - 30;

    const styles = getStyleSheet(theme);
    const placeholder = intl.formatMessage({id: t('edit_post.editPost'), defaultMessage: 'Edit the post...'});
    const inputHeight = Platform.select({
        android: baseHeight - 10,
        ios: baseHeight,
    });
    return (
        <View style={[styles.inputContainer, {height}, hasError && {marginTop: 0}]}>
            <TextInput
                testID='edit_post.message.input'
                value={message}
                blurOnSubmit={false}
                onChangeText={onChangeText}
                multiline={true}
                numberOfLines={10}
                style={[styles.input, {inputHeight}]}
                placeholder={placeholder}
                placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.4)}
                underlineColorAndroid='transparent'
                disableFullscreenUI={true}
                keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                onSelectionChange={onSelectionChange}
                keyboardType={keyboardType}
            />
        </View>
    );
};

export default PostInput;
