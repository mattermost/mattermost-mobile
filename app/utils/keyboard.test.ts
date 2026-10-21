// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';
import {KeyboardController} from 'react-native-keyboard-controller';

import {advanceTimers} from '@test/timer_helpers';

import {dismissKeyboard, isKeyboardVisible} from './keyboard';

describe('dismissKeyboard', () => {
    beforeEach(() => {
        jest.useFakeTimers({doNotFake: ['nextTick']});
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.useRealTimers();
        Platform.OS = 'ios';
    });

    it('should call KeyboardController.dismiss with animated=false', async () => {
        await dismissKeyboard();

        expect(KeyboardController.dismiss).toHaveBeenCalledWith({animated: false});
    });

    // Regression: KeyboardController.dismiss() waits for a `keyboardDidHide` event that
    // can never arrive when the library's internal state is stale. Callers used to await
    // that forever — showPostOptions() then never navigated, so long-pressing a post did
    // nothing at all until the state happened to resync.
    it('should not hang on Android when KeyboardController.dismiss never settles', async () => {
        Platform.OS = 'android';
        jest.mocked(KeyboardController.dismiss).mockReturnValue(new Promise<void>(() => {
            // Never settles, exactly as it behaves after a missed keyboardDidHide.
        }));

        const dismissPromise = dismissKeyboard();
        await advanceTimers(250);

        await expect(dismissPromise).resolves.toBeUndefined();
    });

    // iOS relies on the event to know the keyboard has actually left the screen. Cutting
    // that wait short let callers navigate over a still-visible keyboard.
    // MM-T4865_1, MM-T361_1) that all passed on the commit before it.
    it('should keep awaiting KeyboardController.dismiss on iOS', async () => {
        Platform.OS = 'ios';
        let settle: () => void = () => undefined;
        jest.mocked(KeyboardController.dismiss).mockReturnValue(new Promise<void>((resolve) => {
            settle = resolve;
        }));

        let resolved = false;
        const dismissPromise = dismissKeyboard().then(() => {
            resolved = true;
        });

        await advanceTimers(5000);
        expect(resolved).toBe(false);

        settle();
        await dismissPromise;
        expect(resolved).toBe(true);
    });
});

describe('isKeyboardVisible', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return KeyboardController.isVisible()', () => {
        jest.mocked(KeyboardController.isVisible).mockReturnValue(true);

        expect(isKeyboardVisible()).toBe(true);
        expect(KeyboardController.isVisible).toHaveBeenCalledTimes(1);
    });
});
