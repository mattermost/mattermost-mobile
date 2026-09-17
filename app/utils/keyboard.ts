// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';
import {KeyboardController} from 'react-native-keyboard-controller';

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
 * Dismisses the keyboard via KeyboardController, which both platforms use since
 * they always lay out edge-to-edge.
 */
export const dismissKeyboard = async (): Promise<void> => {
    const dismissed = KeyboardController.dismiss({animated: false});

    // Android only: this promise settles on a `keyboardDidHide` event, and a missed
    // one leaves the library's internal state saying "open" so it never settles at
    // all. Callers await this before navigating (showPostOptions does), so a missed
    // event stops a long press from opening post options. iOS keeps the unbounded
    // await — there the event is what tells us the keyboard has left the screen.
    if (Platform.OS === 'android') {
        await withTimeout(dismissed, DISMISS_ANIMATION_TIMEOUT);
        return;
    }

    await dismissed;
};

/**
 * Checks if the keyboard is currently visible.
 */
export const isKeyboardVisible = (): boolean => KeyboardController.isVisible();
