// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback, useEffect, useRef, useState} from 'react';
import {Platform} from 'react-native';
import {scheduleOnUI} from 'react-native-worklets';

import {isAndroidEdgeToEdge} from '@constants/device';
import {useKeyboardState} from '@context/keyboard_state';

import type {PasteTextInputInstance} from '@mattermost/react-native-paste-input';

/**
 * Hook to handle focusing input after emoji picker is dismissed on Android.
 * On Android, when the emoji picker is open and user tries to focus the input,
 * the emoji picker closes but the keyboard doesn't open. This hook handles
 * the delayed focus logic to ensure the keyboard opens properly.
 *
 */
export const useFocusAfterEmojiDismiss = (
    inputRef: React.MutableRefObject<PasteTextInputInstance | null>,
    focusInput: () => void,
) => {
    const {
        showInputAccessoryView,
        setShowInputAccessoryView,
        setIsEmojiSearchFocused,
        stateContext,
        stateMachine,
    } = useKeyboardState();

    const [isManuallyFocusingAfterEmojiDismiss, setIsManuallyFocusingAfterEmojiDismiss] = useState(false);
    const isDismissingEmojiPicker = useRef(false);
    const focusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Handle focus after emoji picker is dismissed
    useEffect(() => {
        if (Platform.OS === 'android' && isManuallyFocusingAfterEmojiDismiss && !showInputAccessoryView) {
            isDismissingEmojiPicker.current = false;

            if (focusTimeoutRef.current) {
                clearTimeout(focusTimeoutRef.current);
            }

            inputRef.current?.blur();

            // Use requestAnimationFrame to ensure state updates have been applied
            const raf = requestAnimationFrame(() => {
                const handleDelayedFocus = () => {
                    focusInput();
                    setIsManuallyFocusingAfterEmojiDismiss(false);
                    focusTimeoutRef.current = null;
                };

                focusTimeoutRef.current = setTimeout(handleDelayedFocus, 200);
            });

            return () => {
                if (raf) {
                    cancelAnimationFrame(raf);
                }

                if (focusTimeoutRef.current) {
                    clearTimeout(focusTimeoutRef.current);
                    focusTimeoutRef.current = null;
                }
            };
        }

        return undefined;
    }, [isManuallyFocusingAfterEmojiDismiss, showInputAccessoryView, inputRef, focusInput]);

    // Wrapped focus function that handles emoji picker dismissal
    const focusWithEmojiDismiss = useCallback(() => {
        // Android < 35: Use complex dismissal logic with delays
        // Android >= 35 (EdgeToEdge): Use simple focus like iOS - state machine handles transition
        if (Platform.OS === 'android' && !isAndroidEdgeToEdge && showInputAccessoryView) {
            isDismissingEmojiPicker.current = true;
            setIsManuallyFocusingAfterEmojiDismiss(true);

            // Set guard flag to block keyboard events during transition
            stateContext.isEmojiPickerTransition.value = true;

            // Animate emoji picker to 0 and dispatch close event
            scheduleOnUI(() => {
                'worklet';
                stateContext.inputAccessoryHeight.value = 0;
                stateContext.postInputTranslateY.value = 0;
            });

            setIsEmojiSearchFocused(false);
            setShowInputAccessoryView(false);
            stateMachine.onUserCloseEmoji();

            if (focusTimeoutRef.current) {
                clearTimeout(focusTimeoutRef.current);
            }

            inputRef.current?.blur();

            // Schedule focus after emoji picker closes
            focusTimeoutRef.current = setTimeout(() => {
                focusInput();
                setIsManuallyFocusingAfterEmojiDismiss(false);
                isDismissingEmojiPicker.current = false;
                focusTimeoutRef.current = null;

                // Clear guard flag after transition completes
                stateContext.isEmojiPickerTransition.value = false;
            }, 200);
        } else {
            focusInput();
        }
    }, [
        showInputAccessoryView,
        setShowInputAccessoryView,
        setIsEmojiSearchFocused,
        inputRef,
        focusInput,
        stateContext,
        stateMachine,
    ]);

    return {
        focus: focusWithEmojiDismiss,
        isDismissingEmojiPicker,
        focusTimeoutRef,
        isManuallyFocusingAfterEmojiDismiss,
    };
};
