// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Keyboard} from 'react-native';
import {KeyboardController} from 'react-native-keyboard-controller';

import * as Device from '@constants/device';

const DISMISS_ANIMATION_TIMEOUT = 250;

// KeyboardController.dismiss() settles only when a `keyboardDidHide` event arrives,
// and it decides whether to wait on a module-level `isClosed` flag that the library
// maintains from its own keyboardWillShow/keyboardDidHide listeners. If a hide event
// is ever missed — for example the keyboard is torn down by a navigation at the same
// moment KeyboardStateProvider is disabled and calls in here — that flag is left
// saying "open" while the keyboard is already gone, and the promise never settles.
// Every awaiting caller then hangs for the rest of the session: showPostOptions()
// awaits this before navigating, so long-pressing a post silently does nothing.
// Bound the wait so a missed event degrades to a slightly early return instead of a
// permanently wedged UI. `animated: false` means there is no animation to outlast.
const dismissWithKeyboardController = async () => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        await Promise.race([
            KeyboardController.dismiss({animated: false}),
            new Promise<void>((resolve) => {
                timer = setTimeout(resolve, DISMISS_ANIMATION_TIMEOUT);
            }),
        ]);
    } finally {
        if (timer) {
            clearTimeout(timer);
        }
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
        await dismissWithKeyboardController();
    } else {
        Keyboard.dismiss();
        await new Promise((resolve) => setTimeout(resolve, DISMISS_ANIMATION_TIMEOUT));
    }
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
