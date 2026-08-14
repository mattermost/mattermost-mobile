// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Keyboard} from 'react-native';
import {KeyboardController} from 'react-native-keyboard-controller';

import {isEdgeToEdge} from '@constants/device';

/**
 * Dismisses the keyboard using platform-specific implementation.
 * - iOS: Uses KeyboardController.dismiss() which provides better control
 * - Android: Uses React Native's Keyboard.dismiss() since KeyboardProvider
 *   is not used on Android (to avoid layout issues)
 */
export const dismissKeyboard = async (): Promise<void> => {
    if (isEdgeToEdge) {
        await KeyboardController.dismiss({animated: false});
    } else {
        Keyboard.dismiss();
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
};

/**
 * Checks if the keyboard is currently visible.
 * - iOS: Uses KeyboardController.isVisible() for accurate keyboard state
 * - Android: Uses React Native's Keyboard.isVisible() since KeyboardProvider
 *   is not used on Android (to avoid layout issues)
 */
export const isKeyboardVisible = (): boolean => {
    if (isEdgeToEdge) {
        return KeyboardController.isVisible();
    }
    return Keyboard.isVisible();
};
