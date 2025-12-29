// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {StyleSheet, View} from 'react-native';

import {searchCustomEmojis} from '@actions/remote/custom_emoji';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {debounce} from '@helpers/api/general';
import {getKeyboardAppearanceFromTheme} from '@utils/theme';

import EmojiFiltered from '../emoji_filtered';
import EmojiPickerHeader from '../emoji_picker_header';
import CustomEmojiSections from '../emoji_sections';

import type CustomEmojiModel from '@typings/database/models/servers/custom_emoji';
import type {SharedValue} from 'react-native-reanimated';

type Props = {
    customEmojis: CustomEmojiModel[];
    customEmojisEnabled: boolean;
    onEmojiPress: (emoji: string) => void;
    imageUrl?: string;
    file?: ExtractedFileInfo;
    recentEmojis: string[];
    testID?: string;
    isEmojiSearchFocused: boolean;
    setIsEmojiSearchFocused: React.Dispatch<React.SetStateAction<boolean>>;
    emojiPickerHeight: SharedValue<number>;
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
});

const EmojiPicker: React.FC<Props> = ({
    customEmojisEnabled,
    imageUrl,
    file,
    recentEmojis,
    customEmojis,
    onEmojiPress,
    testID = '',
    isEmojiSearchFocused,
    setIsEmojiSearchFocused,
    emojiPickerHeight,
}) => {
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const [searchTerm, setSearchTerm] = useState<string|undefined>();

    const onCancelSearch = useCallback(() => setSearchTerm(undefined), []);

    const searchCustom = debounce((text: string) => {
        if (text && text.length > 1) {
            searchCustomEmojis(serverUrl, text);
        }
    }, 500);

    const onChangeSearchTerm = useCallback((text: string) => {
        setSearchTerm(text);
        searchCustom(text.replace(/^:|:$/g, '').trim());
    }, [searchCustom]);

    const term = searchTerm?.replace(/^:|:$/g, '').trim() || '';

    const EmojiList = (
        <EmojiFiltered
            customEmojis={customEmojis}
            searchTerm={term}
            onEmojiPress={onEmojiPress}
            hideEmojiNames={isEmojiSearchFocused}
        />
    );

    const EmojiSection = (
        <CustomEmojiSections
            customEmojis={customEmojis}
            customEmojisEnabled={customEmojisEnabled}
            imageUrl={imageUrl}
            file={file}
            onEmojiPress={onEmojiPress}
            recentEmojis={recentEmojis}
        />
    );

    return (
        <View
            style={styles.flex}
            testID='emoji_picker'
        >
            <EmojiPickerHeader
                autoCapitalize='none'
                keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                onCancel={onCancelSearch}
                onChangeText={onChangeSearchTerm}
                testID={`${testID}.search_bar`}
                value={searchTerm}
                setIsEmojiSearchFocused={setIsEmojiSearchFocused}
                emojiPickerHeight={emojiPickerHeight}
            />
            {!isEmojiSearchFocused && EmojiSection}
            {isEmojiSearchFocused && EmojiList}
        </View>
    );
};

export default EmojiPicker;
