// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Keyboard} from 'react-native';
import {KeyboardController} from 'react-native-keyboard-controller';

import * as Device from '@constants/device';

const DISMISS_ANIMATION_TIMEOUT = 250;

// Resolve on whichever comes first, and always clear the timer.
const withTimeout = async (promise: Promise<void>, ms: number) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        await Promise.race([promise, new Promise<void>((resolve) => {
            timer = setTimeout(resolve, ms);
        })]);
    } finally {
        clearTimeout(timer);
    }
};

/**
 * Dismisses the keyboard using platform-specific implementation.
 * - iOS: Uses KeyboardController.dismiss() which provides better control
 * - Android: Uses React Native's Keyboard.dismiss() since KeyboardProvider
 *   is not used on Android (to avoid layout issues)
 */
export const dismissKeyboard = async (): Promise<void> => {
    if (Device.isEdgeToEdge) {
        const dismissed = KeyboardController.dismiss({animated: false});

        // Android only: this promise settles on a `keyboardDidHide` event, and a missed
        // one leaves the library's internal state saying "open" so it never settles at
        // all. Callers await this before navigating (showPostOptions does), so a missed
        // event stops a long press from opening post options. iOS keeps the unbounded
        // await — there the event is what tells us the keyboard has left the screen.
        if (Device.isAndroidEdgeToEdge) {
            await withTimeout(dismissed, DISMISS_ANIMATION_TIMEOUT);
            return;
        }

        await dismissed;
        return;
    }

    Keyboard.dismiss();
    await new Promise((resolve) => setTimeout(resolve, DISMISS_ANIMATION_TIMEOUT));
};

/**
 * Checks if the keyboard is currently visible.
 * - iOS: Uses KeyboardController.isVisible() for accurate keyboard state
 * - Android: Uses React Native's Keyboard.isVisible() since KeyboardProvider
 *   is not used on Android (to avoid layout issues)
 */
export const isKeyboardVisible = (): boolean => {
    if (Device.isEdgeToEdge) {
        return KeyboardController.isVisible();
    }
    return Keyboard.isVisible();
};
