// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback, useRef, useState} from 'react';
import {FlatList} from 'react-native';
import {KeyboardController} from 'react-native-keyboard-controller';
import {useAnimatedStyle} from 'react-native-reanimated';

import {useKeyboardAnimation} from './keyboardAnimation';
import {useKeyboardScrollAdjustment} from './useKeyboardScrollAdjustment';

import type {PasteInputRef} from '@mattermost/react-native-paste-input';
import type PostModel from '@typings/database/models/servers/post';

/**
 * Default height for post input container
 * Empirically measured value for iOS to prevent content shifting on initial render
 */
const DEFAULT_POST_INPUT_HEIGHT = 91;

export const useKeyboardAwarePostDraft = () => {
    const [postInputContainerHeight, setPostInputContainerHeight] = useState(DEFAULT_POST_INPUT_HEIGHT);
    const listRef = useRef<FlatList<string | PostModel>>(null);
    const inputRef = useRef<PasteInputRef>();

    const {
        height,
        inset,
        offset,
        scroll,
        onScroll,
    } = useKeyboardAnimation(postInputContainerHeight);

    useKeyboardScrollAdjustment(listRef, scroll, offset);

    const inputContainerAnimatedStyle = useAnimatedStyle(
        () => ({
            transform: [{translateY: -height.value}],
        }),
        [],
    );

    const blurInput = useCallback(() => {
        inputRef.current?.blur();
    }, []);

    const focusInput = useCallback(() => {
        inputRef.current?.focus();
    }, []);

    const blurAndDismissKeyboard = useCallback(async () => {
        inset.value = 0;
        offset.value = 0;
        height.value = 0;
        inputRef.current?.blur();
        await KeyboardController.dismiss();
    }, [height, inset, offset]);

    return {
        height,
        listRef,
        inputRef,
        contentInset: inset,
        onScroll,
        postInputContainerHeight,
        setPostInputContainerHeight,
        inputContainerAnimatedStyle,
        keyboardHeight: height,
        offset,
        scroll,
        blurInput,
        focusInput,
        blurAndDismissKeyboard,
    };
};

