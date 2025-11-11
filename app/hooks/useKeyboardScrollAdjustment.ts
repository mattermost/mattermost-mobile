// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback} from 'react';
import {runOnJS, useAnimatedReaction, type SharedValue} from 'react-native-reanimated';

import type PostModel from '@typings/database/models/servers/post';
import type {FlatList} from 'react-native';

/**
 * Custom hook to handle automatic scrolling when keyboard opens
 * Keeps messages in the same relative position to the input container
 */
export const useKeyboardScrollAdjustment = (
    scrollViewRef: React.RefObject<FlatList<string | PostModel>>,
    scroll: SharedValue<number>,
    offset: SharedValue<number>,
) => {
    // Callback to scroll the view (needs to be stable reference for runOnJS)
    const scrollToOffset = useCallback(
        (offsetValue: number, scrollValue: number) => {
            scrollViewRef.current?.scrollToOffset({
                offset: -offsetValue + scrollValue,
                animated: false,
            });
        },
        [scrollViewRef],
    );

    // Watch for offset changes and adjust scroll position accordingly
    useAnimatedReaction(
        () => offset.value,
        (currentOffset) => {
            runOnJS(scrollToOffset)(currentOffset, scroll.value);
        },
        [offset],
    );
};
