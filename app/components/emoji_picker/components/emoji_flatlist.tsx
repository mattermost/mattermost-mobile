// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {FlatList} from 'react-native';

import {SCROLL_VIEW_NATIVE_ID} from '@components/emoji_picker';
import TouchableEmoji from '@components/emoji_picker/components/emoji_touchable';
import EmptyList from '@components/emoji_picker/components/empty_list';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

type EmojiFlatListProps = {
    filteredEmojis: string[];
    searchTerm: string;
    onEmojiPress: (emojiName: string) => void;
};

const EmojiFlatList = ({filteredEmojis, searchTerm, onEmojiPress}: EmojiFlatListProps) => {
    const theme = useTheme();
    const styles = getStyleSheetFromTheme(theme);

    const contentContainerStyle = filteredEmojis.length ? null : styles.flex;

    const keyExtractor = useCallback((item: string) => item, []);

    const renderItem = useCallback(({item}) => {
        return (
            <TouchableEmoji
                onEmojiPress={onEmojiPress}
                item={item}
            />
        );
    }, []);

    return (
        <FlatList
            contentContainerStyle={contentContainerStyle}
            data={filteredEmojis}
            initialNumToRender={50}
            keyboardShouldPersistTaps='always'
            keyExtractor={keyExtractor}
            ListEmptyComponent={<EmptyList searchTerm={searchTerm}/>}
            nativeID={SCROLL_VIEW_NATIVE_ID}
            renderItem={renderItem}
            removeClippedSubviews={true}
            style={styles.flatList}
        />
    );
};

const getStyleSheetFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        flex: {
            flex: 1,
        },
        flatList: {
            flex: 1,
            backgroundColor: theme.centerChannelBg,
            alignSelf: 'stretch',
        },
    };
});

export default EmojiFlatList;
