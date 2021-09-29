// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {memo, useCallback, useMemo} from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';

import Emoji from '@components/emoji';

type EmojiPickerRowProps = {
    emojiGutter: number;
    emojiSize: number;
    item: EmojisData;
    items: EmojiAlias[];
    onEmojiPress: (emojiName: string) => void;
    section: RenderableEmojis;
};

const EmojiPickerRow = ({emojiGutter, emojiSize, item, items, onEmojiPress, section}: EmojiPickerRowProps) => {
    const memoizedEmojis = useMemo(() => items, [items]);

    const renderEmojis = useCallback((emoji: EmojiAlias, index: number, emojis: EmojiAlias[]) => {
        const size = emojiSize + 7;
        const style: any = [
            styles.emoji,
            {width: size, height: size, marginHorizontal: emojiGutter},
        ];

        if (index === 0) {
            style.push(styles.emojiLeft);
        } else if (index === emojis.length - 1) {
            style.push(styles.emojiRight);
        }

        if (!emoji) {
            return (
                <View
                    key={index}
                    style={style}
                />);
        }

        const name = 'short_name' in emoji ? emoji.short_name : emoji.name;

        return (
            <TouchableOpacity
                key={name}
                style={style}
                onPress={() => onEmojiPress(name)}
            >
                <Emoji
                    emojiName={name}
                    textStyle={styles.emojiText}
                    size={emojiSize}
                />
            </TouchableOpacity>
        );
    }, []);

    return (
        <View
            testID={section.id}
            key={`Picker-Row-${section.id}${item.key}`}
        >
            <View style={[styles.columnStyle, {marginVertical: emojiGutter}]}>
                {memoizedEmojis.map(renderEmojis)}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    columnStyle: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    emoji: {
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    emojiText: {
        color: '#000',
        fontWeight: 'bold',
    },
    emojiLeft: {
        marginLeft: 0,
    },
    emojiRight: {
        marginRight: 0,
    },
});

export default memo(EmojiPickerRow);
