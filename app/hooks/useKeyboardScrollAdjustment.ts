// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback} from 'react';
import {runOnJS, useAnimatedReaction, type SharedValue} from 'react-native-reanimated';

import type PostModel from '@typings/database/models/servers/post';
import type {FlatList} from 'react-native';

/**
 * Custom hook to handle automatic scrolling when keyboard opens
 * Keeps messages in the same relative position to the input container
 * Only enabled on iOS - Android uses native keyboard handling
 */
export const useKeyboardScrollAdjustment = (
    scrollViewRef: React.RefObject<FlatList<string | PostModel>>,
    scroll: SharedValue<number>,
    offset: SharedValue<number>,
    enabled = true,
    isInputAccessoryViewMode?: SharedValue<boolean>,
    isTransitioningFromCustomView?: SharedValue<boolean>,
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
        () => ({
            offset: offset.value,
            isInputAccessoryViewMode: isInputAccessoryViewMode?.value || false,
            isTransitioning: isTransitioningFromCustomView?.value || false,
        }),
        (current, previous) => {
            // Skip scroll adjustment when:
            // - Input Accessory view (emoji picker) is active
            // - Transitioning from custom view to keyboard (heights are same, no scroll needed)
            // - Offset hasn't actually changed (prevents re-scrolling after transition ends)
            const offsetChanged = previous === null || Math.abs(current.offset - (previous?.offset || 0)) > 0.5;

            if (enabled && !current.isInputAccessoryViewMode && !current.isTransitioning && offsetChanged) {
                runOnJS(scrollToOffset)(current.offset, scroll.value);
            }
        },
        [offset, enabled, isInputAccessoryViewMode, isTransitioningFromCustomView],
    );
};
