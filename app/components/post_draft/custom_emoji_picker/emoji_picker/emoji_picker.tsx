// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {StyleSheet, View} from 'react-native';

import {searchCustomEmojis} from '@actions/remote/custom_emoji';
import {useServerUrl} from '@app/context/server';
import {useTheme} from '@app/context/theme';
import {debounce} from '@app/helpers/api/general';
import EmojiSections from '@app/screens/emoji_picker/picker/sections';
import {getKeyboardAppearanceFromTheme} from '@app/utils/theme';

import EmojiFiltered from '../emoji_filtered';
import EmojiPickerHeader from '../emoji_picker_header';

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
    handleToggleEmojiPicker: () => void;
    deleteCharFromCurrentCursorPosition: () => void;
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
    handleToggleEmojiPicker,
    deleteCharFromCurrentCursorPosition,
    isEmojiSearchFocused,
    setIsEmojiSearchFocused,
    emojiPickerHeight,
}) => {
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const [searchTerm, setSearchTerm] = useState<string|undefined>();

    const onCancelSearch = useCallback(() => setSearchTerm(undefined), []);

    const onChangeSearchTerm = useCallback((text: string) => {
        setSearchTerm(text);
        searchCustom(text.replace(/^:|:$/g, '').trim());
    }, []);

    const searchCustom = debounce((text: string) => {
        if (text && text.length > 1) {
            searchCustomEmojis(serverUrl, text);
        }
    }, 500);

    const term = searchTerm?.replace(/^:|:$/g, '').trim() || '';

    const EmojiList = (
        <EmojiFiltered
            customEmojis={customEmojis}
            searchTerm={term}
            onEmojiPress={onEmojiPress}
        />
    );

    const EmojiSection = (
        <EmojiSections
            customEmojis={customEmojis}
            customEmojisEnabled={customEmojisEnabled}
            imageUrl={imageUrl}
            file={file}
            onEmojiPress={onEmojiPress}
            recentEmojis={recentEmojis}
            handleToggleEmojiPicker={handleToggleEmojiPicker}
            deleteCharFromCurrentCursorPosition={deleteCharFromCurrentCursorPosition}
            isEmojiPicker={true}
        />
    );

    return (
        <View
            style={styles.flex}
            testID='emoji_picker'
        >
            <View>
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
            </View>
            {!isEmojiSearchFocused && EmojiSection}
            {isEmojiSearchFocused && EmojiList}
        </View>
    );
};

export default EmojiPicker;
