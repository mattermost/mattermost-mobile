// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Fuse from 'fuse.js';
import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {FlatList, Text, View, type ListRenderItemInfo} from 'react-native';
import Animated from 'react-native-reanimated';

import {useTheme} from '@context/theme';
import {getEmojis, searchEmojis} from '@utils/emoji/helpers';
import {makeStyleSheetFromTheme} from '@utils/theme';

import EmojiItem from './emoji_item';

import type CustomEmojiModel from '@typings/database/models/servers/custom_emoji';

type Props = {
    customEmojis: CustomEmojiModel[];
    skinTone: string;
    searchTerm: string;
    onEmojiPress: (emojiName: string) => void;
    hideEmojiNames?: boolean;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            paddingVertical: 4,
            paddingHorizontal: 12,
        },
        listContainer: {
            flexGrow: 1,
            justifyContent: 'center',
        },
        noResultContainer: {
            height: 40,
            margin: 10,
        },
        noResultText: {
            color: theme.centerChannelColor,
            opacity: 0.72,
        },
    };
});

const EmojiFiltered: React.FC<Props> = ({
    customEmojis,
    skinTone,
    searchTerm = '',
    onEmojiPress,
    hideEmojiNames = false,
}) => {
    const emojis = useMemo(() => getEmojis(skinTone, customEmojis), [skinTone, customEmojis]);
    const intl = useIntl();
    const theme = useTheme();
    const style = getStyleSheet(theme);

    const fuse = useMemo(() => {
        const options = {findAllMatches: true, ignoreLocation: true, includeMatches: true, shouldSort: false, includeScore: true};
        return new Fuse(emojis, options);
    }, [emojis]);

    const data = useMemo(() => {
        if (!searchTerm) {
            return emojis;
        }

        return searchEmojis(fuse, searchTerm);
    }, [emojis, fuse, searchTerm]);

    const keyExtractor = (item: string) => item;

    const renderEmpty = useCallback(() => {
        return (
            <View style={style.noResultContainer}>
                <Text style={style.noResultText}>
                    {intl.formatMessage({
                        id: 'custom_emoji_picker.search.no_results',
                        defaultMessage: 'No results',
                    })}
                </Text>
            </View>
        );
    }, [style, intl]);

    const renderItem = useCallback(({item}: ListRenderItemInfo<string>) => {
        return (
            <EmojiItem
                onEmojiPress={onEmojiPress}
                name={item}
                hideName={hideEmojiNames}
                shouldDismissKeyboard={false}
            />
        );
    }, [
        onEmojiPress,
        hideEmojiNames,
    ]);

    return (
        <Animated.View style={style.container}>
            <FlatList
                data={data}
                initialNumToRender={30}
                keyboardDismissMode='interactive'
                keyboardShouldPersistTaps='always'
                keyExtractor={keyExtractor}
                ListEmptyComponent={renderEmpty}
                renderItem={renderItem}
                removeClippedSubviews={false}
                horizontal={true}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={data.length === 0 && style.listContainer}
            />
        </Animated.View>
    );
};

export default EmojiFiltered;
