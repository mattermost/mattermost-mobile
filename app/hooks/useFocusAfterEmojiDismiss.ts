// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback, useEffect, useRef, useState} from 'react';
import {Platform} from 'react-native';
import {runOnUI} from 'react-native-reanimated';

import {useKeyboardAnimationContext} from '@context/keyboard_animation';

import type {PasteInputRef} from '@mattermost/react-native-paste-input';

/**
 * Hook to handle focusing input after emoji picker is dismissed on Android.
 * On Android, when the emoji picker is open and user tries to focus the input,
 * the emoji picker closes but the keyboard doesn't open. This hook handles
 * the delayed focus logic to ensure the keyboard opens properly.
 *
 */
export const useFocusAfterEmojiDismiss = (
    inputRef: React.MutableRefObject<PasteInputRef | undefined>,
    focusInput: () => void,
) => {
    const {
        showInputAccessoryView,
        setShowInputAccessoryView,
        isInputAccessoryViewMode,
        inputAccessoryViewAnimatedHeight,
        keyboardTranslateY,
        isTransitioningFromCustomView,
        setIsEmojiSearchFocused,
    } = useKeyboardAnimationContext();

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
            requestAnimationFrame(() => {
                const handleDelayedFocus = () => {
                    focusInput();
                    setIsManuallyFocusingAfterEmojiDismiss(false);
                    focusTimeoutRef.current = null;
                };

                focusTimeoutRef.current = setTimeout(handleDelayedFocus, 200);
            });

            return () => {
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
        if (Platform.OS === 'android' && showInputAccessoryView) {
            isDismissingEmojiPicker.current = true;
            setIsManuallyFocusingAfterEmojiDismiss(true);

            runOnUI(() => {
                'worklet';
                inputAccessoryViewAnimatedHeight.value = 0;
                keyboardTranslateY.value = 0;
                isInputAccessoryViewMode.value = false;
                isTransitioningFromCustomView.value = true;
            })();

            setIsEmojiSearchFocused(false);
            setShowInputAccessoryView(false);

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
            }, 200);
        } else {
            focusInput();
        }
    }, [
        showInputAccessoryView,
        inputAccessoryViewAnimatedHeight,
        setShowInputAccessoryView,
        isInputAccessoryViewMode,
        keyboardTranslateY,
        isTransitioningFromCustomView,
        setIsEmojiSearchFocused,
        inputRef,
        focusInput,
    ]);

    return {
        focus: focusWithEmojiDismiss,
        isDismissingEmojiPicker,
        focusTimeoutRef,
        isManuallyFocusingAfterEmojiDismiss,
    };
};
