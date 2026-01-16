// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useState} from 'react';
import {runOnJS, useAnimatedReaction, useSharedValue, type SharedValue} from 'react-native-reanimated';

/**
 * Default height for the input accessory view when keyboard height is unknown
 */
export const DEFAULT_INPUT_ACCESSORY_HEIGHT = 335;

type UseInputAccessoryViewParams = {
    keyboardHeight: SharedValue<number>;
    isKeyboardFullyOpen: SharedValue<boolean>;
};

export const useInputAccessoryView = ({
    keyboardHeight,
    isKeyboardFullyOpen,
}: UseInputAccessoryViewParams) => {
    const [showInputAccessoryView, setShowInputAccessoryView] = useState(false);
    const [lastKeyboardHeight, setLastKeyboardHeight] = useState(0);
    const inputAccessoryViewAnimatedHeight = useSharedValue(0);

    useAnimatedReaction(
        () => ({
            height: keyboardHeight.value,
            isFullyOpen: isKeyboardFullyOpen.value,
        }),
        (current, previous) => {
            if (
                current.isFullyOpen &&
                current.height > 0 &&
                (!previous || !previous.isFullyOpen || previous.height !== current.height)
            ) {
                runOnJS(setLastKeyboardHeight)(current.height);
            }
        },
        [keyboardHeight, isKeyboardFullyOpen],
    );

    return {
        showInputAccessoryView,
        setShowInputAccessoryView,
        lastKeyboardHeight,
        setLastKeyboardHeight,
        inputAccessoryViewAnimatedHeight,
    };
};

