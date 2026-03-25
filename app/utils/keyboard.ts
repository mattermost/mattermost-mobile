// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Keyboard, Platform} from 'react-native';
import {KeyboardController} from 'react-native-keyboard-controller';

/**
 * Dismisses the keyboard using platform-specific implementation.
 * - iOS: Uses KeyboardController.dismiss() which provides better control
 * - Android: Uses React Native's Keyboard.dismiss() since KeyboardProvider
 *   is not used on Android (to avoid layout issues)
 */
export const dismissKeyboard = async (): Promise<void> => {
    if (Platform.OS === 'ios') {
        await KeyboardController.dismiss();
    } else {
        Keyboard.dismiss();
    }
};

/**
 * Checks if the keyboard is currently visible.
 * - iOS: Uses KeyboardController.isVisible() for accurate keyboard state
 * - Android: Uses React Native's Keyboard.isVisible() since KeyboardProvider
 *   is not used on Android (to avoid layout issues)
 */
export const isKeyboardVisible = (): boolean => {
    if (Platform.OS === 'ios') {
        return KeyboardController.isVisible();
    }
    return Keyboard.isVisible();
};
