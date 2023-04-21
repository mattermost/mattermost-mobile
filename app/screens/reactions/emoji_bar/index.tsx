// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef} from 'react';
import {type ListRenderItemInfo, StyleSheet} from 'react-native';
import {FlatList} from 'react-native-gesture-handler';

import {useIsTablet} from '@hooks/device';

import Item from './item';

import type ReactionModel from '@typings/database/models/servers/reaction';

type Props = {
    emojiSelected: string;
    reactionsByName: Map<string, ReactionModel[]>;
    setIndex: (idx: number) => void;
    sortedReactions: string[];
}

type ScrollIndexFailed = {
    index: number;
    highestMeasuredFrameIndex: number;
    averageItemLength: number;
};

const style = StyleSheet.create({
    container: {
        maxHeight: 44,
    },
});

const EmojiBar = ({emojiSelected, reactionsByName, setIndex, sortedReactions}: Props) => {
    const isTablet = useIsTablet();
    const listRef = useRef<FlatList<string>>(null);

    const scrollToIndex = (index: number, animated = false) => {
        listRef.current?.scrollToIndex({
            animated,
            index,
            viewOffset: 0,
            viewPosition: 1, // 0 is at bottom
        });
    };

    const onPress = useCallback((emoji: string) => {
        const index = sortedReactions.indexOf(emoji);
        setIndex(index);
    }, [sortedReactions]);

    const onScrollToIndexFailed = useCallback((info: ScrollIndexFailed) => {
        const index = Math.min(info.highestMeasuredFrameIndex, info.index);

        scrollToIndex(index);
    }, []);

    const renderItem = useCallback(({item}: ListRenderItemInfo<string>) => {
        return (
            <Item
                count={reactionsByName.get(item)?.length || 0}
                emojiName={item}
                highlight={item === emojiSelected}
                onPress={onPress}
            />
        );
    }, [onPress, emojiSelected, reactionsByName]);

    useEffect(() => {
        const t = setTimeout(() => {
            listRef.current?.scrollToItem({
                item: emojiSelected,
                animated: false,
                viewPosition: 1,
            });
        }, 100);

        return () => clearTimeout(t);
    }, []);

    return (
        <FlatList
            bounces={false}
            data={sortedReactions}
            horizontal={true}
            ref={listRef}
            renderItem={renderItem}
            style={[style.container, {marginTop: isTablet ? 12 : 0}]}
            onScrollToIndexFailed={onScrollToIndexFailed}
            overScrollMode='never'
        />
    );
};

export default EmojiBar;
