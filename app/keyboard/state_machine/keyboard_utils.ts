// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';

import {isEdgeToEdge} from '@constants/device';
import {DEFAULT_INPUT_ACCESSORY_HEIGHT, MINIMAL_EMOJI_LIST_HEIGHT, SEARCH_BAR_HEIGHT, SEARCH_CONTAINER_PADDING, SEARCH_VISIBILITY_OFFSET} from '@keyboard/constants';
import {InputContainerStateType, type ActionUpdates, type StateEvent, type StateSnapshot} from '@keyboard/state_machine/types';

/**
 * Guard function to check if keyboard height indicates a software keyboard
 * Heights > 75px are considered meaningful software keyboard heights
 */
export const isSoftwareKeyboard = (snapshot: StateSnapshot, event: StateEvent): boolean => {
    'worklet';
    const height = event.height ?? snapshot.keyboardEventHeight;
    return height > 75;
};

/**
 * Guard function to check if keyboard height is near zero
 * Heights < 75px are considered zero (keyboard fully dismissed or external keyboard).
 * hasZeroKeyboardHeight extends this to catch hardware keyboard events that arrive with
 * a small but non-zero height — but only when the event height is itself below the
 * software keyboard threshold. A clear software keyboard height (> 75) always wins.
 */
export const isZeroHeight = (snapshot: StateSnapshot, event: StateEvent): boolean => {
    'worklet';
    const height = event.height ?? snapshot.keyboardEventHeight;
    if (height > 75) {
        return false;
    }
    return height < 75 || snapshot.hasZeroKeyboardHeight;
};

/**
 * Calculate adjusted keyboard height accounting for tab bar and safe area
 * Uses progressive calculation based on keyboard progress
 */
export function calculateAdjustedHeight(
    lastKeyboardHeight: number,
    tabBarHeight: number,
    safeAreaBottom: number,
    rawHeight: number,
): number {
    'worklet';

    const targetHeight = lastKeyboardHeight > 0 ? lastKeyboardHeight : rawHeight;
    const keyboardProgress = rawHeight > 0 ? Math.min(1, rawHeight / Math.max(targetHeight, DEFAULT_INPUT_ACCESSORY_HEIGHT)) : 0;
    const tabBarAdjustment = tabBarHeight + (safeAreaBottom * keyboardProgress);
    return Math.max(0, rawHeight - tabBarAdjustment);
}

/**
 * Calculate keyboard-related updates (postInputTranslateY, scrollOffset)
 * This drives the scroll padding and scroll compensation
 */
export function calculateKeyboardUpdates(snapshot: StateSnapshot, adjustedHeight: number, rawKeyboardHeight: number): ActionUpdates {
    'worklet';

    const currentState = snapshot.currentState;
    const isOpening = currentState === InputContainerStateType.KEYBOARD_OPENING;
    const isOpen = currentState === InputContainerStateType.KEYBOARD_OPEN;
    const needsConstantSubtraction = isOpening || isOpen;

    const tabBarAdjustment = snapshot.tabBarHeight + snapshot.safeAreaBottom;

    // Check if this is an adjustment event (adjustedHeight !== rawKeyboardHeight)
    // When adjustment event fires, adjustedHeight is set to lastHeight by processEvent
    // We should use that value directly instead of recalculating from rawKeyboardHeight
    const needsAdjustment = Math.abs(adjustedHeight - rawKeyboardHeight) > 50;

    let effectiveHeight: number;
    if (needsAdjustment) {
        effectiveHeight = adjustedHeight;
    } else if (needsConstantSubtraction) {
        // During opening/open/closing: constant subtraction to eliminate gap
        if (rawKeyboardHeight <= tabBarAdjustment) {
            effectiveHeight = 0;
        } else {
            effectiveHeight = Math.max(0, rawKeyboardHeight - tabBarAdjustment);
        }
    } else {
        effectiveHeight = adjustedHeight;
    }

    const updates: ActionUpdates = {
        postInputTranslateY: {value: effectiveHeight, animated: false},
    };

    if (Platform.OS === 'ios') {
        updates.scrollOffset = {value: effectiveHeight, animated: false};
    }

    return updates;
}

/**
 * Calculate the total height of search UI components (search bar + padding + visibility offset)
 * This is the additional height added on top of keyboard height when emoji search is active
 * @param tabBarHeight - Tab bar height (for tablets in split view)
 * @param safeAreaBottom - Bottom safe area height (for devices with notch or home indicator)
 * @returns The total height of search components
 */
export function getEmojiSearchActiveHeight(tabBarHeight: number, safeAreaBottom: number): number {
    'worklet';

    const offset = isEdgeToEdge ? SEARCH_VISIBILITY_OFFSET : SEARCH_CONTAINER_PADDING;
    return (SEARCH_BAR_HEIGHT + SEARCH_CONTAINER_PADDING + offset + MINIMAL_EMOJI_LIST_HEIGHT + tabBarHeight) - safeAreaBottom;
}

/**
 * Calculate emoji search height based on keyboard height
 * @param keyboardHeight - Current keyboard height (0 if no keyboard or hardware keyboard)
 * @param tabBarHeight - Tab bar height (for tablets in split view)
 * @param safeAreaBottom - Bottom safe area height
 * @returns The calculated search height
 */
export function calculateSearchHeight(keyboardHeight: number, tabBarHeight: number, safeAreaBottom: number): number {
    'worklet';

    return keyboardHeight + getEmojiSearchActiveHeight(tabBarHeight, safeAreaBottom);
}
