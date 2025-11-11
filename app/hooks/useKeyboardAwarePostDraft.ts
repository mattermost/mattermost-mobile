// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useRef, useState} from 'react';
import {FlatList} from 'react-native';
import {useAnimatedStyle} from 'react-native-reanimated';

import {useKeyboardAnimation} from './keyboardAnimation';
import {useKeyboardScrollAdjustment} from './useKeyboardScrollAdjustment';

import type PostModel from '@typings/database/models/servers/post';

export const useKeyboardAwarePostDraft = () => {
    const [postInputContainerHeight, setPostInputContainerHeight] = useState(0);
    const listRef = useRef<FlatList<string | PostModel>>(null);

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

    return {
        height,
        listRef,
        contentInset: inset,
        onScroll,
        postInputContainerHeight,
        setPostInputContainerHeight,
        inputContainerAnimatedStyle,
        keyboardHeight: height,
        offset,
        scroll,
    };
};

