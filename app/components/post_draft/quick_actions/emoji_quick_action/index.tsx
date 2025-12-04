// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useRef} from 'react';
import {Platform, StyleSheet} from 'react-native';
import {KeyboardController} from 'react-native-keyboard-controller';
import {runOnJS, runOnUI} from 'react-native-reanimated';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {ICON_SIZE} from '@constants/post_draft';
import {useKeyboardAnimationContext} from '@context/keyboard_animation';
import {useTheme} from '@context/theme';
import {DEFAULT_INPUT_ACCESSORY_HEIGHT} from '@hooks/useInputAccessoryView';
import {changeOpacity} from '@utils/theme';

type Props = {
    testID?: string;
    disabled?: boolean;
};

const style = StyleSheet.create({
    icon: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
    },
});

export default function EmojiQuickAction({
    testID,
    disabled,
}: Props) {
    const theme = useTheme();
    const {
        isInputAccessoryViewMode,
        isTransitioningFromCustomView,
        keyboardHeight,
        lastKeyboardHeight,
        inputAccessoryViewAnimatedHeight,
        showInputAccessoryView,
        setShowInputAccessoryView,
        isKeyboardFullyClosed,
    } = useKeyboardAnimationContext();

    const showEmojiPicker = useCallback(() => {
        setShowInputAccessoryView(true);
    }, [setShowInputAccessoryView]);

    const checkCallbackRef = useRef<(() => void) | null>(null);

    const scheduleKeyboardCheck = useCallback(() => {
        const checkKeyboard = () => {
            runOnUI(() => {
                'worklet';
                const currentKeyboardHeight = keyboardHeight.value;
                const targetHeight = currentKeyboardHeight || lastKeyboardHeight || DEFAULT_INPUT_ACCESSORY_HEIGHT;

                if (isKeyboardFullyClosed.value || keyboardHeight.value === 0) {
                    // Match iOS order: Set SharedValues first, then trigger React render
                    // This ensures values are set before emoji picker component mounts
                    isInputAccessoryViewMode.value = true;
                    inputAccessoryViewAnimatedHeight.value = targetHeight;

                    // Trigger React render to mount emoji picker component
                    runOnJS(showEmojiPicker)();
                } else if (checkCallbackRef.current) {
                    runOnJS(checkCallbackRef.current)();
                }
            })();
        };

        checkCallbackRef.current = () => {
            requestAnimationFrame(checkKeyboard);
        };

        checkKeyboard();
    }, [keyboardHeight, lastKeyboardHeight, isKeyboardFullyClosed, isInputAccessoryViewMode, inputAccessoryViewAnimatedHeight, showEmojiPicker]);

    const handleButtonPress = useCallback(() => {
        // Prevent opening if already showing or transitioning
        if ((disabled || showInputAccessoryView || isTransitioningFromCustomView.value) && Platform.OS !== 'android') {
            return;
        }

        if (Platform.OS === 'android') {
            KeyboardController.dismiss();

            // Wait for keyboard to be fully dismissed before showing emoji picker
            // This prevents the emoji picker from appearing above the keyboard
            // Start checking after a small delay to give keyboard dismissal time to start
            setTimeout(scheduleKeyboardCheck, 50);
            return;
        }

        // CRITICAL: Execute all shared value updates atomically on UI thread.
        // Why? When KeyboardController.dismiss() is called, it immediately fires keyboard events
        // (onStart, onMove, onEnd) on the UI thread. If we set isInputAccessoryViewMode on the
        // JS thread, there's a race condition - the keyboard handlers might fire BEFORE the flag
        // propagates to the UI thread, causing them to process the dismiss event incorrectly.
        // By running everything on UI thread, we guarantee isInputAccessoryViewMode is set
        // BEFORE keyboard events fire, ensuring they are properly ignored.
        runOnUI(() => {
            'worklet';

            // Determine target height for emoji picker
            const currentKeyboardHeight = keyboardHeight.value;
            const targetHeight = currentKeyboardHeight || lastKeyboardHeight || DEFAULT_INPUT_ACCESSORY_HEIGHT;

            // Enable custom view mode before keyboard dismissal to prevent keyboard handlers from interfering
            isInputAccessoryViewMode.value = true;

            // Set emoji picker height to target
            // Note: Don't modify `height` yet - it will be set to 0 after emoji picker mounts
            // This keeps the input container at the keyboard position while emoji picker renders
            inputAccessoryViewAnimatedHeight.value = targetHeight;

            // Trigger React render to mount emoji picker component
            runOnJS(setShowInputAccessoryView)(true);

            // Dismiss keyboard
            runOnJS(KeyboardController.dismiss)();
        })();
    }, [disabled, showInputAccessoryView, isTransitioningFromCustomView.value, keyboardHeight.value, lastKeyboardHeight, isInputAccessoryViewMode, inputAccessoryViewAnimatedHeight, setShowInputAccessoryView, scheduleKeyboardCheck]);

    const actionTestID = disabled ? `${testID}.disabled` : testID;
    const color = disabled ? changeOpacity(theme.centerChannelColor, 0.16) : changeOpacity(theme.centerChannelColor, 0.64);

    return (
        <TouchableWithFeedback
            testID={actionTestID}
            disabled={disabled}
            onPress={handleButtonPress}
            style={style.icon}
            type={'opacity'}
        >
            <CompassIcon
                color={color}
                name='emoticon-happy-outline'
                size={ICON_SIZE}
            />
        </TouchableWithFeedback>
    );
}

