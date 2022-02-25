// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {KeyboardType, NativeSyntheticEvent, StyleProp, TextInput, TextInputSelectionChangeEventData, View, ViewStyle} from 'react-native';

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
}));

type Props = {
    keyboardType: KeyboardType;
    message: string;
    containerStyle: StyleProp<ViewStyle>;
    onSelectionChange: (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => void;
    onChangeText: (text: string) => void;
    height: number;
}
const PostInput = ({containerStyle, height, keyboardType, message, onChangeText, onSelectionChange}: Props) => {
    const theme = useTheme();
    const intl = useIntl();

    const styles = getStyleSheet(theme);
    const placeholder = intl.formatMessage({id: t('edit_post.editPost'), defaultMessage: 'Edit the post...'});

    return (
        <View style={containerStyle}>
            <TextInput
                allowFontScaling={true}
                testID='edit_post.message.input'
                value={message}
                blurOnSubmit={false}
                onChangeText={onChangeText}
                multiline={true}
                numberOfLines={10}
                style={[styles.input, {height}]}
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
