// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, View} from 'react-native';

import {searchCustomEmojis} from '@actions/remote/custom_emoji';
import {useServerUrl} from '@app/context/server';
import {useTheme} from '@app/context/theme';
import {debounce} from '@app/helpers/api/general';
import {getKeyboardAppearanceFromTheme} from '@app/utils/theme';

import EmojiFiltered from '../emoji_filtered';
import EmojiPickerHeader from '../emoji_picker_header';
import EmojiSections from '../emoji_sections';

import type CustomEmojiModel from '@typings/database/models/servers/custom_emoji';

type Props = {
    customEmojis: CustomEmojiModel[];
    customEmojisEnabled: boolean;
    onEmojiPress: (emoji: string) => void;
    imageUrl?: string;
    file?: ExtractedFileInfo;
    recentEmojis: string[];
    testID?: string;
    focus?: () => void;
    deleteCharFromCurrentCursorPosition: () => void;
    isEmojiSearchFocused: boolean;
    setIsEmojiSearchFocused: React.Dispatch<React.SetStateAction<boolean>>;
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
    focus,
    deleteCharFromCurrentCursorPosition,
    isEmojiSearchFocused,
    setIsEmojiSearchFocused,
}) => {
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const [searchTerm, setSearchTerm] = React.useState<string|undefined>();

    const onCancelSearch = React.useCallback(() => setSearchTerm(undefined), []);

    const onChangeSearchTerm = React.useCallback((text: string) => {
        setSearchTerm(text);
        searchCustom(text.replace(/^:|:$/g, '').trim());
    }, []);

    const searchCustom = debounce((text: string) => {
        if (text && text.length > 1) {
            searchCustomEmojis(serverUrl, text);
        }
    }, 500);

    let EmojiList: React.ReactNode = null;
    const term = searchTerm?.replace(/^:|:$/g, '').trim();

    if (term) {
        EmojiList = (
            <EmojiFiltered
                customEmojis={customEmojis}
                searchTerm={term}
                onEmojiPress={onEmojiPress}
            />
        );
    }

    const EmojiSection = (
        <EmojiSections
            customEmojis={customEmojis}
            customEmojisEnabled={customEmojisEnabled}
            imageUrl={imageUrl}
            file={file}
            onEmojiPress={onEmojiPress}
            recentEmojis={recentEmojis}
            focus={focus}
            deleteCharFromCurrentCursorPosition={deleteCharFromCurrentCursorPosition}
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
                />
            </View>
            {!isEmojiSearchFocused && EmojiSection}
            {isEmojiSearchFocused && EmojiList}
        </View>
    );
};

export default EmojiPicker;
