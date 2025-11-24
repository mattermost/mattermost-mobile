// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {createContext, useContext, useMemo, useRef, useCallback, type ReactNode} from 'react';
import {useSharedValue, type SharedValue} from 'react-native-reanimated';

import type {PasteInputRef} from '@mattermost/react-native-paste-input';

interface KeyboardAnimationContextType {
    height: SharedValue<number>;
    inset: SharedValue<number>;
    offset: SharedValue<number>;
    keyboardHeight: SharedValue<number>;
    scroll: SharedValue<number>;
    onScroll: (event: unknown) => void;
    postInputContainerHeight: number;
    inputRef: React.MutableRefObject<PasteInputRef | undefined>;
    blurInput: () => void;
    focusInput: () => void;
    blurAndDismissKeyboard: () => Promise<void>;
    isKeyboardFullyOpen: SharedValue<boolean>;
    isKeyboardFullyClosed: SharedValue<boolean>;
    isKeyboardInTransition: SharedValue<boolean>;
    showInputAccessoryView: boolean;
    isInputAccessoryViewMode: SharedValue<boolean>;
    setShowInputAccessoryView: (show: boolean) => void;
    lastKeyboardHeight: number;
    inputAccessoryViewAnimatedHeight: SharedValue<number>;
    isTransitioningFromCustomView: SharedValue<boolean>;
}

const KeyboardAnimationContext = createContext<KeyboardAnimationContextType | null>(null);

export const KeyboardAnimationProvider = ({
    children,
    value,
}: {
    children: ReactNode;
    value: KeyboardAnimationContextType;
}) => {
    return (
        <KeyboardAnimationContext.Provider value={value}>
            {children}
        </KeyboardAnimationContext.Provider>
    );
};

const DEFAULT_POST_INPUT_HEIGHT = 91;

export const useKeyboardAnimationContext = () => {
    const context = useContext(KeyboardAnimationContext);

    // Always create default values (hooks must be called unconditionally)
    const defaultHeight = useSharedValue(0);
    const defaultInset = useSharedValue(0);
    const defaultOffset = useSharedValue(0);
    const defaultKeyboardHeight = useSharedValue(0);
    const defaultScroll = useSharedValue(0);
    const defaultIsKeyboardFullyOpen = useSharedValue(false);
    const defaultIsKeyboardFullyClosed = useSharedValue(true);
    const defaultIsKeyboardInTransition = useSharedValue(false);
    const defaultInputRef = useRef<PasteInputRef | undefined>(undefined);
    const defaultIsInputAccessoryViewMode = useSharedValue(false);
    const defaultIsTransitioningFromCustomView = useSharedValue(false);
    const defaultInputAccessoryViewAnimatedHeight = useSharedValue(0);
    const defaultOnScroll = useCallback(() => {
        // No-op fallback
    }, []);
    const defaultBlurInput = useCallback(() => {
        // No-op fallback
    }, []);
    const defaultFocusInput = useCallback(() => {
        // No-op fallback
    }, []);
    const defaultBlurAndDismissKeyboard = useCallback(async () => {
        // No-op fallback
    }, []);

    const defaultSetShowInputAccessoryView = useCallback(() => {
        // No-op fallback
    }, []);

    const fallbackValue = useMemo(() => ({
        height: defaultHeight,
        inset: defaultInset,
        offset: defaultOffset,
        keyboardHeight: defaultKeyboardHeight,
        scroll: defaultScroll,
        onScroll: defaultOnScroll,
        postInputContainerHeight: DEFAULT_POST_INPUT_HEIGHT,
        inputRef: defaultInputRef,
        blurInput: defaultBlurInput,
        focusInput: defaultFocusInput,
        blurAndDismissKeyboard: defaultBlurAndDismissKeyboard,
        isKeyboardFullyOpen: defaultIsKeyboardFullyOpen,
        isKeyboardFullyClosed: defaultIsKeyboardFullyClosed,
        isKeyboardInTransition: defaultIsKeyboardInTransition,
        setShowInputAccessoryView: defaultSetShowInputAccessoryView,
        showInputAccessoryView: false,
        lastKeyboardHeight: 0,
        isInputAccessoryViewMode: defaultIsInputAccessoryViewMode,
        inputAccessoryViewAnimatedHeight: defaultInputAccessoryViewAnimatedHeight,
        isTransitioningFromCustomView: defaultIsTransitioningFromCustomView,
    }), [
        defaultHeight,
        defaultInset,
        defaultOffset,
        defaultKeyboardHeight,
        defaultScroll,
        defaultOnScroll,
        defaultInputRef,
        defaultBlurInput,
        defaultFocusInput,
        defaultBlurAndDismissKeyboard,
        defaultIsKeyboardFullyOpen,
        defaultIsKeyboardFullyClosed,
        defaultIsKeyboardInTransition,
        defaultSetShowInputAccessoryView,
        defaultIsInputAccessoryViewMode,
        defaultInputAccessoryViewAnimatedHeight,
        defaultIsTransitioningFromCustomView,
    ]);

    // If context exists, return it; otherwise return fallback
    return context || fallbackValue;
};

