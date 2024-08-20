// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Fuse from 'fuse.js';
import React from 'react';
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
        noResultContainer: {
            marginTop: 10,
            flex: 1, // Take up the full available space
            alignItems: 'center', // Center horizontally
            justifyContent: 'center', // Center vertically
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
    searchTerm,
    onEmojiPress,
}) => {
    const emojis = React.useMemo(() => getEmojis(skinTone, customEmojis), [skinTone, customEmojis]);
    const intl = useIntl();
    const theme = useTheme();
    const style = getStyleSheet(theme);

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
                <Text style={style.noResultText}>
                    {intl.formatMessage({
                        id: 'custom_emoji_picker.search.no_results',
                        defaultMessage: 'No results',
                    })}
                </Text>
            </View>
        );
    }, [searchTerm]);

    const renderItem = React.useCallback(({item}: ListRenderItemInfo<string>) => {
        return (
            <EmojiItem
                onEmojiPress={onEmojiPress}
                name={item}
                shouldShowName={false}
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
            horizontal={data.length !== 0}
        />
    );
};

export default EmojiFiltered;
