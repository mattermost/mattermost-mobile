// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, View} from 'react-native';

import TouchableEmoji from '@components/touchable_emoji';
import {EMOJI_ROW_MARGIN, EMOJI_SIZE} from '@constants/emoji';

import ImageEmoji from './emoji_image';

export interface EmojiSectionRow {
    type: 'row';
    emojis: EmojiAlias[];
    sectionIndex: number;
    category: string;
    index: number;
}

type EmojiRowProps = {
    emojis: EmojiAlias[];
    onEmojiPress: (emoji: string) => void;
    imageUrl?: string;
    file?: ExtractedFileInfo;
}

const styles = StyleSheet.create(({
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: EMOJI_ROW_MARGIN,
    },
    emoji: {
        height: EMOJI_SIZE,
        width: EMOJI_SIZE,
    },
    imageEmoji: {
        width: 28,
        height: 28,
    },
}));

export default function EmojiRow({emojis, file, imageUrl, onEmojiPress}: EmojiRowProps) {
    return (
        <View style={styles.row}>
            {emojis.map((emoji, index) => {
                if (!emoji.name && !emoji.short_name) {
                    return (
                        <View
                            key={`empty-${index.toString()}`}
                            style={styles.emoji}
                        />
                    );
                }

                if (emoji.category === 'image') {
                    return (
                        <ImageEmoji
                            key={`${index.toString()}-${emoji.name}`}
                            file={file}
                            imageUrl={imageUrl}
                            onEmojiPress={onEmojiPress}
                            path={emoji.name}
                        />
                    );
                }

                return (
                    <TouchableEmoji
                        key={`${index.toString()}-${emoji.name}`}
                        name={emoji.name}
                        onEmojiPress={onEmojiPress}
                        category={emoji.category}
                    />
                );
            })}
        </View>
    );
}
