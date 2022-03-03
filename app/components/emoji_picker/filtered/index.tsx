// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Fuse from 'fuse.js';
import React, {useCallback, useMemo} from 'react';
import {FlatList} from 'react-native';

import {getEmojis, searchEmojis} from '@utils/emoji/helpers';

import EmojiItem from './emoji_item';
import NoResults from './no_results';

import type CustomEmojiModel from '@typings/database/models/servers/custom_emoji';

type Props = {
    customEmojis: CustomEmojiModel[];
    skinTone: string;
    searchTerm: string;
    onEmojiPress: (emojiName: string) => void;
};

const EmojiFiltered = ({customEmojis, skinTone, searchTerm, onEmojiPress}: Props) => {
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

    const keyExtractor = useCallback((item) => item, []);

    const renderItem = useCallback(({item}) => {
        return (
            <EmojiItem
                onEmojiPress={onEmojiPress}
                name={item}
            />
        );
    }, []);

    if (!data.length) {
        return <NoResults searchTerm={searchTerm}/>;
    }

    return (
        <FlatList
            data={data}
            initialNumToRender={30}
            keyboardShouldPersistTaps='always'
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            removeClippedSubviews={false}
        />
    );
};

export default EmojiFiltered;
