// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Fuse from 'fuse.js';
import React, {useCallback, useMemo} from 'react';
import {FlatList} from 'react-native';

import {Emojis, EmojiIndicesByAlias} from '@utils/emoji';
import {compareEmojis, getSkin} from '@utils/emoji/helpers';

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
    const emojis = useMemo(() => {
        const emoticons = new Set<string>();
        for (const [key, index] of EmojiIndicesByAlias.entries()) {
            const skin = getSkin(Emojis[index]);
            if (!skin || skin === skinTone) {
                emoticons.add(key);
            }
        }

        for (const custom of customEmojis) {
            emoticons.add(custom.name);
        }

        return Array.from(emoticons);
    }, [skinTone, customEmojis]);

    const fuse = useMemo(() => {
        const options = {findAllMatches: true, ignoreLocation: true, includeMatches: true, shouldSort: false, includeScore: true};
        return new Fuse(emojis, options);
    }, [emojis]);

    const data = useMemo(() => {
        const searchTermLowerCase = searchTerm.toLowerCase();

        if (!searchTerm) {
            return [];
        }

        const sorter = (a: string, b: string) => {
            return compareEmojis(a, b, searchTermLowerCase);
        };

        const fuzz = fuse.search(searchTermLowerCase);

        if (fuzz) {
            const results = fuzz.reduce((values, r) => {
                const score = r?.score === undefined ? 1 : r.score;
                const v = r?.matches?.[0]?.value;
                if (score < 0.2 && v) {
                    values.push(v);
                }

                return values;
            }, [] as string[]);

            return results.sort(sorter);
        }

        return [];
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
