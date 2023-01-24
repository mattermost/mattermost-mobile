// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {StyleSheet, View} from 'react-native';

import {searchCustomEmojis} from '@actions/remote/custom_emoji';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {debounce} from '@helpers/api/general';
import {getKeyboardAppearanceFromTheme} from '@utils/theme';

import EmojiFiltered from './filtered';
import PickerHeader from './header';
import EmojiSections from './sections';

import type CustomEmojiModel from '@typings/database/models/servers/custom_emoji';

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
    customEmojis: CustomEmojiModel[];
    customEmojisEnabled: boolean;
    onEmojiPress: (emoji: string) => void;
    recentEmojis: string[];
    testID?: string;
}

const Picker = ({customEmojis, customEmojisEnabled, onEmojiPress, recentEmojis, testID = ''}: Props) => {
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const [searchTerm, setSearchTerm] = useState<string|undefined>();

    const onCancelSearch = useCallback(() => setSearchTerm(undefined), []);

    const onChangeSearchTerm = useCallback((text: string) => {
        setSearchTerm(text);
        searchCustom(text);
    }, []);

    const searchCustom = debounce((text: string) => {
        if (text && text.length > 1) {
            searchCustomEmojis(serverUrl, text);
        }
    }, 500);

    let EmojiList: React.ReactNode = null;
    if (searchTerm) {
        EmojiList = (
            <EmojiFiltered
                customEmojis={customEmojis}
                searchTerm={searchTerm}
                onEmojiPress={onEmojiPress}
            />
        );
    } else {
        EmojiList = (
            <EmojiSections
                customEmojis={customEmojis}
                customEmojisEnabled={customEmojisEnabled}
                onEmojiPress={onEmojiPress}
                recentEmojis={recentEmojis}
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
