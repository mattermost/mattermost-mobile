// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback, useRef, useState} from 'react';
import {FlatList, Platform} from 'react-native';
import {KeyboardController} from 'react-native-keyboard-controller';
import {useAnimatedStyle} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {isAndroidEdgeToEdge} from '@constants/device';
import {useIsTablet} from '@hooks/device';

import {useKeyboardAnimation} from './keyboardAnimation';
import {useKeyboardScrollAdjustment} from './useKeyboardScrollAdjustment';

import type {PasteTextInputInstance} from '@mattermost/react-native-paste-input';
import type PostModel from '@typings/database/models/servers/post';

/**
 * Default height for post input container
 * Empirically measured value for iOS to prevent content shifting on initial render
 */
const DEFAULT_POST_INPUT_HEIGHT = 91;

// Enable keyboard animations for iOS and Android 30+ (with edge-to-edge)
// Android < 30 uses native adjustResize behavior
const isEdgeToEdge = Platform.OS === 'ios' || isAndroidEdgeToEdge;

export const useKeyboardAwarePostDraft = (isThreadView = false, enabled = true) => {
    const [postInputContainerHeight, setPostInputContainerHeight] = useState(DEFAULT_POST_INPUT_HEIGHT);
    const listRef = useRef<FlatList<string | PostModel>>(null);
    const inputRef = useRef<PasteTextInputInstance | null>(null);
    const isTablet = useIsTablet();
    const insets = useSafeAreaInsets();

    const {
        keyboardTranslateY,
        bottomInset,
        scrollOffset,
        scrollPosition,
        onScroll,
        isKeyboardFullyOpen,
        isKeyboardFullyClosed,
        isKeyboardInTransition,
        isInputAccessoryViewMode,
        isTransitioningFromCustomView,
    } = useKeyboardAnimation(postInputContainerHeight, isEdgeToEdge, isTablet, insets.bottom, isThreadView, enabled);

    // Apply scroll adjustment on iOS and Android 30+ (with edge-to-edge)
    // Android < 30 uses native keyboard handling with adjustResize
    // Also pass isInputAccessoryViewMode and isTransitioningFromCustomView to control scroll behavior
    useKeyboardScrollAdjustment(listRef, scrollPosition, scrollOffset, Platform.OS === 'ios', isInputAccessoryViewMode, isTransitioningFromCustomView);

    const inputContainerAnimatedStyle = useAnimatedStyle(
        () => {
            return {
                transform: [{translateY: isEdgeToEdge ? -keyboardTranslateY.value : 0}],
            };
        },
        [],
    );

    const blurInput = useCallback(() => {
        inputRef.current?.blur();
    }, []);

    const focusInput = useCallback(() => {
        inputRef.current?.focus();
    }, []);

    const blurAndDismissKeyboard = useCallback(async () => {
        bottomInset.value = 0;
        scrollOffset.value = 0;
        keyboardTranslateY.value = 0;
        inputRef.current?.blur();
        await KeyboardController.dismiss();
    }, [keyboardTranslateY, bottomInset, scrollOffset]);

    return {
        keyboardTranslateY,
        listRef,
        inputRef,
        contentInset: bottomInset,
        onScroll,
        postInputContainerHeight,
        setPostInputContainerHeight,
        inputContainerAnimatedStyle,
        keyboardHeight: keyboardTranslateY,
        scrollOffset,
        scrollPosition,
        blurInput,
        focusInput,
        blurAndDismissKeyboard,
        isKeyboardFullyOpen,
        isKeyboardFullyClosed,
        isKeyboardInTransition,
        isInputAccessoryViewMode,
        isTransitioningFromCustomView,
    };
};

