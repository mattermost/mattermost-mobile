// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback, useRef, useState} from 'react';
import {FlatList, Platform} from 'react-native';
import {KeyboardController} from 'react-native-keyboard-controller';
import {useAnimatedStyle} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useIsTablet} from '@hooks/device';

import {useKeyboardAnimation} from './keyboardAnimation';
import {useKeyboardScrollAdjustment} from './useKeyboardScrollAdjustment';

import type {PasteInputRef} from '@mattermost/react-native-paste-input';
import type PostModel from '@typings/database/models/servers/post';

/**
 * Default height for post input container
 * Empirically measured value for iOS to prevent content shifting on initial render
 */
const DEFAULT_POST_INPUT_HEIGHT = 91;

const isIOS = Platform.OS === 'ios';

export const useKeyboardAwarePostDraft = (isThreadView = false, enabled = true) => {
    const [postInputContainerHeight, setPostInputContainerHeight] = useState(DEFAULT_POST_INPUT_HEIGHT);
    const listRef = useRef<FlatList<string | PostModel>>(null);
    const inputRef = useRef<PasteInputRef>();
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
    } = useKeyboardAnimation(postInputContainerHeight, isIOS, isTablet, insets.bottom, isThreadView, enabled);

    // Only apply scroll adjustment on iOS, Android uses native keyboard handling
    // Also pass isInputAccessoryViewMode and isTransitioningFromCustomView to control scroll behavior
    useKeyboardScrollAdjustment(listRef, scrollPosition, scrollOffset, isIOS, isInputAccessoryViewMode, isTransitioningFromCustomView);

    const inputContainerAnimatedStyle = useAnimatedStyle(
        () => {
            return {
                transform: [{translateY: isIOS ? -keyboardTranslateY.value : 0}],
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

