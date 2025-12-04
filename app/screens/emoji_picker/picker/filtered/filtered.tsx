// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetFlashList} from '@gorhom/bottom-sheet';
import {FlashList, type ListRenderItemInfo} from '@shopify/flash-list';
import Fuse from 'fuse.js';
import React, {useCallback, useMemo} from 'react';
import {StyleSheet, View} from 'react-native';

import NoResultsWithTerm from '@components/no_results_with_term';
import {useIsTablet} from '@hooks/device';
import {getEmojis, searchEmojis} from '@utils/emoji/helpers';

import EmojiItem from './emoji_item';

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

const EmojiFiltered = ({customEmojis, skinTone, searchTerm, onEmojiPress}: Props) => {
    const isTablet = useIsTablet();
    const emojis = useMemo(() => getEmojis(skinTone, customEmojis), [skinTone, customEmojis]);

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

    const List = useMemo(() => (isTablet ? FlashList : BottomSheetFlashList), [isTablet]);

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
    }, [onEmojiPress]);

    return (
        <List
            data={data}
            estimatedItemSize={40}
            keyboardDismissMode='interactive'
            keyboardShouldPersistTaps='always'
            keyExtractor={keyExtractor}
            ListEmptyComponent={renderEmpty}
            renderItem={renderItem}
        />
    );
};

export default EmojiFiltered;
