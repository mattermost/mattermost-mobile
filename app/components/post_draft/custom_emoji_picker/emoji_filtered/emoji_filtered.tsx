// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Fuse from 'fuse.js';
import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {FlatList, Text, View, type ListRenderItemInfo} from 'react-native';

import {useTheme} from '@app/context/theme';
import EmojiItem from '@app/screens/emoji_picker/picker/filtered/emoji_item';
import {getEmojis, searchEmojis} from '@app/utils/emoji/helpers';
import {makeStyleSheetFromTheme} from '@app/utils/theme';

import type CustomEmojiModel from '@typings/database/models/servers/custom_emoji';

type Props = {
    customEmojis: CustomEmojiModel[];
    skinTone: string;
    searchTerm: string;
    onEmojiPress: (emojiName: string) => void;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flex: 1,
            paddingVertical: 4,
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
    }, [fuse, searchTerm]);

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
                shouldShowName={false}
            />
        );
    }, [
        onEmojiPress,
    ]);

    return (
        <View style={style.container}>
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
        </View>
    );
};

export default EmojiFiltered;
