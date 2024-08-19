// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Fuse from 'fuse.js';
import React from 'react';
import {FlatList, StyleSheet, View, type ListRenderItemInfo} from 'react-native';

import NoResultsWithTerm from '@app/components/no_results_with_term';
import EmojiItem from '@app/screens/emoji_picker/picker/filtered/emoji_item';
import {getEmojis, searchEmojis} from '@app/utils/emoji/helpers';

import type CustomEmojiModel from '@typings/database/models/servers/custom_emoji';

type Props = {
    customEmojis: CustomEmojiModel[];
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

const EmojiFiltered: React.FC<Props> = ({
    customEmojis,
    skinTone,
    searchTerm,
    onEmojiPress,
}) => {
    const emojis = React.useMemo(() => getEmojis(skinTone, customEmojis), [skinTone, customEmojis]);

    const fuse = React.useMemo(() => {
        const options = {findAllMatches: true, ignoreLocation: true, includeMatches: true, shouldSort: false, includeScore: true};
        return new Fuse(emojis, options);
    }, [emojis]);

    const data = React.useMemo(() => {
        if (!searchTerm) {
            return [];
        }

        return searchEmojis(fuse, searchTerm);
    }, [fuse, searchTerm]);

    const keyExtractor = React.useCallback((item: string) => item, []);

    const renderEmpty = React.useCallback(() => {
        return (
            <View style={style.noResultContainer}>
                <NoResultsWithTerm term={searchTerm}/>
            </View>
        );
    }, [searchTerm]);

    const renderItem = React.useCallback(({item}: ListRenderItemInfo<string>) => {
        return (
            <EmojiItem
                onEmojiPress={onEmojiPress}
                name={item}
            />
        );
    }, []);

    return (
        <FlatList
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
