// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Fuse from 'fuse.js';
import React, {useCallback, useMemo} from 'react';
import {FlatList, ListRenderItemInfo, StyleSheet, View} from 'react-native';

import NoResultsWithTerm from '@components/no_results_with_term';
import {getEmojis, searchEmojis} from '@utils/emoji/helpers';

import EmojiItem from './emoji_item';

import type CustomEmojiModel from '@typings/database/models/servers/custom_emoji';

type Props = {
    customEmojis: CustomEmojiModel[];
    keyboardHeight: number;
    skinTone: string;
    searchTerm: string;
    onEmojiPress: (emojiName: string) => void;
};

const style = StyleSheet.create({
    noResultContainer: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

const EmojiFiltered = ({customEmojis, keyboardHeight, skinTone, searchTerm, onEmojiPress}: Props) => {
    const emojis = useMemo(() => getEmojis(skinTone, customEmojis), [skinTone, customEmojis]);
    const flatListStyle = useMemo(() => ({flexGrow: 1, paddingBottom: keyboardHeight}), [keyboardHeight]);

    const fuse = useMemo(() => {
        const options = {findAllMatches: true, ignoreLocation: true, includeMatches: true, shouldSort: false, includeScore: true};
        return new Fuse(emojis, options);
    }, [emojis]);

    const data = useMemo(() => {
        if (!searchTerm) {
            return [];
        }

        return searchEmojis(fuse, searchTerm);
    }, [fuse, searchTerm]);

    const keyExtractor = useCallback((item: string) => item, []);

    const renderEmpty = useCallback(() => {
        return (
            <View style={style.noResultContainer}>
                <NoResultsWithTerm term={searchTerm}/>
            </View>
        );
    }, [searchTerm]);

    const renderItem = useCallback(({item}: ListRenderItemInfo<string>) => {
        return (
            <EmojiItem
                onEmojiPress={onEmojiPress}
                name={item}
            />
        );
    }, []);

    return (
        <FlatList
            contentContainerStyle={flatListStyle}
            data={data}
            initialNumToRender={30}
            keyboardDismissMode='interactive'
            keyboardShouldPersistTaps='always'
            keyExtractor={keyExtractor}
            ListEmptyComponent={renderEmpty}
            renderItem={renderItem}
            removeClippedSubviews={false}
        />
    );
};

export default EmojiFiltered;
