// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState, type FC, useEffect} from 'react';
import {StyleSheet, View} from 'react-native';

import {addRecentReaction} from '@actions/local/reactions';
import {searchCustomEmojis} from '@actions/remote/custom_emoji';
import emojiStore from '@app/store/emoji_picker';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {debounce} from '@helpers/api/general';
import {getKeyboardAppearanceFromTheme} from '@utils/theme';

import EmojiFiltered from './filtered';
import PickerHeader from './header';
import EmojiSections from './sections';

export const SCROLLVIEW_NATIVE_ID = 'emojiSelector';

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    searchBar: {
        paddingBottom: 5,
    },
});

type Props = {
    testID?: string;
    onEmojiPress?: (emoji: string) => void;
}

const Picker: FC<Props> = ({testID = '', onEmojiPress}) => {
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const [searchTerm, setSearchTerm] = useState<string|undefined>();

    useEffect(() => {
        return () => {
            emojiStore.setCurrentCategoryIndex(0);
        };
    }, []);

    const handleOnPressEmoji = (emojiName: string) => {
        if (!onEmojiPress) {
            return;
        }

        onEmojiPress(emojiName);
        addRecentReaction(serverUrl, [emojiName]);
    };

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
                searchTerm={searchTerm}
                onEmojiPress={handleOnPressEmoji}
            />
        );
    } else {
        EmojiList = (
            <EmojiSections
                onEmojiPress={handleOnPressEmoji}
            />
        );
    }

    return (
        <View
            style={styles.container}
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
                    useBottomSheet={true}
                />
            </View>
            {EmojiList}
        </View>
    );
};

export default Picker;
