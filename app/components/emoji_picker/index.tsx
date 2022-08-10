// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React, {useCallback, useState} from 'react';
import {LayoutChangeEvent, Platform, StyleSheet, View} from 'react-native';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {searchCustomEmojis} from '@actions/remote/custom_emoji';
import SearchBar from '@components/search';
import {Preferences} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {debounce} from '@helpers/api/general';
import {useKeyboardHeight} from '@hooks/device';
import {queryAllCustomEmojis} from '@queries/servers/custom_emoji';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';
import {observeConfigBooleanValue, observeRecentReactions} from '@queries/servers/system';
import {getKeyboardAppearanceFromTheme} from '@utils/theme';

import EmojiFiltered from './filtered';
import EmojiSections from './sections';

import type {WithDatabaseArgs} from '@typings/database/database';
import type CustomEmojiModel from '@typings/database/models/servers/custom_emoji';

export const SCROLLVIEW_NATIVE_ID = 'emojiSelector';
const edges: Edge[] = ['bottom', 'left', 'right'];

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    container: {
        flex: 1,
        marginHorizontal: 12,
    },
    searchBar: {
        paddingVertical: 5,
        marginLeft: 12,
        marginRight: Platform.select({ios: 4, default: 12}),
    },
});

type Props = {
    customEmojis: CustomEmojiModel[];
    customEmojisEnabled: boolean;
    onEmojiPress: (emoji: string) => void;
    recentEmojis: string[];
    skinTone: string;
    testID?: string;
}

const EmojiPicker = ({customEmojis, customEmojisEnabled, onEmojiPress, recentEmojis, skinTone, testID = ''}: Props) => {
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const keyboardHeight = useKeyboardHeight();
    const [width, setWidth] = useState(0);
    const [searchTerm, setSearchTerm] = useState<string|undefined>();
    const onLayout = useCallback(({nativeEvent}: LayoutChangeEvent) => setWidth(nativeEvent.layout.width), []);
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
                keyboardHeight={keyboardHeight}
                skinTone={skinTone}
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
                skinTone={skinTone}
                width={width}
            />
        );
    }

    return (
        <SafeAreaView
            style={styles.flex}
            edges={edges}
            testID={`${testID}.screen`}
        >
            <View style={styles.searchBar}>
                <SearchBar
                    autoCapitalize='none'
                    keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                    onCancel={onCancelSearch}
                    onChangeText={onChangeSearchTerm}
                    testID={`${testID}.search_bar`}
                    value={searchTerm}
                />
            </View>
            <View
                style={styles.container}
                onLayout={onLayout}
            >
                {Boolean(width) &&
                <>
                    {EmojiList}
                </>
                }
            </View>
        </SafeAreaView>
    );
};

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    customEmojisEnabled: observeConfigBooleanValue(database, 'EnableCustomEmoji'),
    customEmojis: queryAllCustomEmojis(database).observe(),
    recentEmojis: observeRecentReactions(database),
    skinTone: queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_EMOJI, Preferences.EMOJI_SKINTONE).
        observeWithColumns(['value']).pipe(
            switchMap((prefs) => of$(prefs?.[0]?.value ?? 'default')),
        ),
}));

export default withDatabase(enhanced(EmojiPicker));
