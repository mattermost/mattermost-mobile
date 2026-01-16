// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useRef} from 'react';
import {Platform, StyleSheet} from 'react-native';
import {runOnJS, runOnUI} from 'react-native-reanimated';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {isAndroidEdgeToEdge} from '@constants/device';
import {ICON_SIZE} from '@constants/post_draft';
import {useKeyboardAnimationContext} from '@context/keyboard_animation';
import {useTheme} from '@context/theme';
import {DEFAULT_INPUT_ACCESSORY_HEIGHT} from '@hooks/useInputAccessoryView';
import {usePreventDoubleTap} from '@hooks/utils';
import {dismissKeyboard, isKeyboardVisible} from '@utils/keyboard';
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
        keyboardTranslateY,
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

    const checkKeyboardClosed = useCallback(() => {
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

        // Shared values don't need to be in dependencies - they're stable references
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lastKeyboardHeight, showEmojiPicker]);

    const scheduleKeyboardCheck = useCallback(() => {
        const checkKeyboard = () => {
            runOnUI(checkKeyboardClosed)();
        };

        checkCallbackRef.current = () => {
            requestAnimationFrame(checkKeyboard);
        };

        checkKeyboard();
    }, [checkKeyboardClosed]);

    const handleButtonPress = usePreventDoubleTap(useCallback(() => {
        // Prevent opening if already showing or transitioning
        if (disabled || showInputAccessoryView || isTransitioningFromCustomView.value) {
            return;
        }

        if (Platform.OS === 'android' && isKeyboardVisible()) {
            // Android 30+ with edge-to-edge: Use same flow as iOS to prevent input jumping
            // Set emoji picker state BEFORE dismissing keyboard so input stays in place
            if (isAndroidEdgeToEdge) {
                // Android 30+ with edge-to-edge: Set height FIRST, then mount component
                // This ensures the useEffect (line 394) reads the correct height immediately
                const currentKeyboardHeight = keyboardHeight.value;
                const targetHeight = currentKeyboardHeight || lastKeyboardHeight || DEFAULT_INPUT_ACCESSORY_HEIGHT;

                // Fabric: Execute on UI thread with instant transition (duration: 0)
                runOnUI(() => {
                    'worklet';

                    // STEP 1: Enable custom view mode to block keyboard dismiss handlers
                    isInputAccessoryViewMode.value = true;

                    // STEP 2: Set emoji picker height
                    inputAccessoryViewAnimatedHeight.value = targetHeight;

                    // STEP 3: Move container to bottom instantly
                    // The brief flicker is unavoidable with Fabric's synchronous updates
                    // But it's better than the slow animation or "above keyboard" issue
                    keyboardTranslateY.value = 0;

                    // STEP 4: Mount emoji picker component at bottom
                    runOnJS(setShowInputAccessoryView)(true);

                    // STEP 5: Dismiss keyboard (events blocked by isInputAccessoryViewMode)
                    runOnJS(dismissKeyboard)();
                })();
                return;
            }

            // Android < 30: Original behavior - dismiss keyboard first, then show emoji picker
            dismissKeyboard();

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
            runOnJS(dismissKeyboard)();
        })();

        // Shared values don't need to be in dependencies - they're stable references
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [disabled, showInputAccessoryView, lastKeyboardHeight, setShowInputAccessoryView, scheduleKeyboardCheck]));

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

