// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {FlashList, type ListRenderItemInfo} from '@shopify/flash-list';
import React, {useCallback, useEffect} from 'react';
import {StyleSheet, View} from 'react-native';

import NoResultsWithTerm from '@app/components/no_results_with_term';
import emojiStore from '@app/store/emoji_picker';

import EmojiItem from './emoji_item';

type Props = {
    data: string[];
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

const EmojiFiltered = ({data, searchTerm, onEmojiPress}: Props) => {
    useEffect(() => {
        emojiStore.searchEmojis(searchTerm);
    }, [searchTerm]);

    const keyExtractor = useCallback((item: string) => item, []);

    const renderEmpty = useCallback(() => {
        return (
            <View style={style.noResultContainer}>
                <NoResultsWithTerm term={searchTerm}/>
            </View>
        );
    }, [searchTerm]);

    const renderItem = ({item}: ListRenderItemInfo<string>) => {
        return (
            <EmojiItem
                onEmojiPress={onEmojiPress}
                name={item}
            />
        );
    };

    return (
        <FlashList
            data={data}
            keyboardDismissMode='interactive'
            keyboardShouldPersistTaps='always'
            keyExtractor={keyExtractor}
            ListEmptyComponent={renderEmpty}
            renderItem={renderItem}
            removeClippedSubviews={false}
            estimatedItemSize={40}
        />
    );
};

export default EmojiFiltered;
