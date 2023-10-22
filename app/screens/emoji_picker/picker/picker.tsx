// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';

import {searchCustomEmojis} from '@actions/remote/custom_emoji';
import EmojiFiltered from '@app/components/emoji_picker/filtered';
import EmojiSections from '@app/components/emoji_picker/sections';
import emojiStore from '@app/store/emoji_picker';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {debounce} from '@helpers/api/general';
import {getKeyboardAppearanceFromTheme} from '@utils/theme';

import PickerHeader from './header';

export const SCROLLVIEW_NATIVE_ID = 'emojiSelector';

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    searchBar: {
        paddingBottom: 5,
    },
});

type Props = {
    testID?: string;
    onEmojiPress: (emoji: string) => void;
}

const Picker = ({testID = '', onEmojiPress}: Props) => {
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const [searchTerm, setSearchTerm] = useState<string|undefined>();

    useEffect(() => {
        return () => {
            emojiStore.setCurrentCategoryIndex(0);
        };
    }, []);

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

    let EmojiList: React.ReactNode = null;
    const term = searchTerm?.replace(/^:|:$/g, '').trim();
    if (term) {
        EmojiList = (
            <EmojiFiltered
                searchTerm={term}
                onEmojiPress={onEmojiPress}
            />
        );
    } else {
        EmojiList = (
            <EmojiSections
                onEmojiPress={onEmojiPress}
            />
        );
    }

    return (
        <View
            style={styles.flex}
            testID={`${testID}.screen`}
        >
            <View style={styles.searchBar}>
                <PickerHeader
                    autoCapitalize='none'
                    keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                    onCancel={onCancelSearch}
                    onChangeText={onChangeSearchTerm}
                    testID={`${testID}.search_bar`}
                    value={searchTerm}
                />
            </View>
            {EmojiList}
        </View>
    );
};

export default Picker;
