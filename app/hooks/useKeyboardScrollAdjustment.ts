// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback, useEffect, useRef} from 'react';
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
    scrollPosition: SharedValue<number>,
    scrollOffset: SharedValue<number>,
    enabled = true,
    isInputAccessoryViewMode?: SharedValue<boolean>,
    isTransitioningFromCustomView?: SharedValue<boolean>,
) => {
    // Track component mount status to prevent async callbacks from executing on unmounted components
    const isMountedRef = useRef(true);
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // Callback to scroll the view (needs to be stable reference for runOnJS)
    const scrollToOffset = useCallback(
        (offsetValue: number, scrollValue: number) => {
            if (!isMountedRef.current) {
                return;
            }
            scrollViewRef.current?.scrollToOffset({
                offset: -offsetValue + scrollValue,
                animated: false,
            });
        },
        [scrollViewRef],
    );

    // Watch for scrollOffset changes and adjust scroll position accordingly
    useAnimatedReaction(
        () => ({
            scrollOffset: scrollOffset.value,
            scrollPosition: scrollPosition.value,
            isInputAccessoryViewMode: isInputAccessoryViewMode?.value || false,
            isTransitioning: isTransitioningFromCustomView?.value || false,
        }),
        (current, previous) => {
            'worklet';

            // Skip scroll adjustment when:
            // - Input Accessory view (emoji picker) is active
            // - Transitioning from custom view to keyboard (heights are same, no scroll needed)
            // - scrollOffset hasn't actually changed (prevents re-scrolling after transition ends)
            const scrollOffsetChanged = previous === null || Math.abs(current.scrollOffset - (previous?.scrollOffset || 0)) > 0.5;

            // Don't scroll when keyboard closes - let the list naturally return to position
            if (current.scrollOffset === 0) {
                return;
            }

            // Perform scroll adjustment when keyboard is opening or height changes
            // scrollPosition is preserved (not reset to 0) by keyboardAnimation.ts
            if (enabled && !current.isInputAccessoryViewMode && !current.isTransitioning && scrollOffsetChanged) {
                runOnJS(scrollToOffset)(current.scrollOffset, current.scrollPosition);
            }
        },
        [scrollPosition, scrollOffset, enabled, isInputAccessoryViewMode, isTransitioningFromCustomView],
    );
};
