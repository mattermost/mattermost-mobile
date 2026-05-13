// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type MutableRefObject, type PropsWithChildren} from 'react';
import {DeviceEventEmitter, findNodeHandle, Platform} from 'react-native';
import {useAnimatedKeyboard} from 'react-native-keyboard-controller';
import Animated, {useAnimatedReaction, useAnimatedRef, useAnimatedScrollHandler, type AnimatedRef} from 'react-native-reanimated';
import {scheduleOnRN, scheduleOnUI} from 'react-native-worklets';

import {Events} from '@constants';
import {useIsTablet} from '@hooks/device';
import {useKeyboardEvents} from '@hooks/use_keyboard_events';
import {useKeyboardStateContext, type KeyboardStateContextReturn} from '@hooks/use_keyboard_state_context';
import {useKeyboardStateMachine} from '@hooks/use_keyboard_state_machine';
import {InputContainerStateType} from '@keyboard';
import {dismissKeyboard} from '@utils/keyboard';

import type {PasteTextInputInstance} from '@mattermost/react-native-paste-input';
import type PostModel from '@typings/database/models/servers/post';

type KeyboardStateContextValue = {
    stateContext: KeyboardStateContextReturn;

    // Refs (kept separate from StateContext to avoid freezing by worklets)
    listRef: AnimatedRef<Animated.FlatList<string | PostModel>>;
    inputRef: MutableRefObject<PasteTextInputInstance | null>;
    stateMachine: {
        onUserFocusInput: (asHardwareKeyboard?: boolean) => void;
        onUserOpenEmoji: () => void;
        onUserCloseEmoji: () => void;
        onUserFocusEmojiSearch: (asHardwareKeyboard?: boolean) => void;
        onUserBlurEmojiSearch: () => void;
        isEmojiPickerActive: () => boolean;
    };

    // Scroll handler
    onScroll: ReturnType<typeof useAnimatedScrollHandler>;

    // Emoji picker visibility state
    showInputAccessoryView: boolean;
    setShowInputAccessoryView: React.Dispatch<React.SetStateAction<boolean>>;

    // Emoji search state
    isEmojiSearchFocused: boolean;
    setIsEmojiSearchFocused: (focused: boolean) => void;

    // PostInput callbacks for emoji picker integration
    updateValue: React.Dispatch<React.SetStateAction<string>> | null;
    updateCursorPosition: React.Dispatch<React.SetStateAction<number>> | null;
    getCursorPosition: () => number;
    setCursorPosition: (position: number) => void;
    registerPostInputCallbacks: (
        updateValueFn: React.Dispatch<React.SetStateAction<string>>,
        updateCursorPositionFn: React.Dispatch<React.SetStateAction<number>>,
        initialValue?: string,
    ) => void;

    // Post input container height (synced from SharedValue)
    postInputContainerHeight: number;

    // Keyboard dismiss helpers
    blurAndDismissKeyboard: () => Promise<void>;
    closeInputAccessoryView: () => Promise<void>;
};

const KeyboardStateContext = createContext<KeyboardStateContextValue | undefined>(undefined);

type KeyboardStateProviderProps = PropsWithChildren<{
    tabBarHeight: number;
    enabled?: boolean; // Whether keyboard events should be processed (default: false)
}>;

export function KeyboardStateProvider({children, tabBarHeight, enabled = false}: KeyboardStateProviderProps) {
    // Create refs here (not in StateContext to avoid freezing by worklets)
    const listRef = useAnimatedRef<Animated.FlatList<string | PostModel>>();
    const inputRef = useRef<PasteTextInputInstance | null>(null);
    const blurAndDismissKeyboardRef = useRef<() => Promise<void>>(async () => { /* initialized below */ });

    // Create state context with all SharedValues
    const stateContext = useKeyboardStateContext({tabBarHeight, enabled});

    // Create state machine with event dispatchers
    const stateMachine = useKeyboardStateMachine(stateContext);

    const animatedKeyboard = useAnimatedKeyboard();
    const isTablet = useIsTablet();

    const [inputTag, setInputTag] = useState<number | null>(null);

    // Emoji picker visibility state
    const [showInputAccessoryView, setShowInputAccessoryView] = useState(false);

    // Emoji search state (derived from state machine)
    const [isEmojiSearchFocused, setIsEmojiSearchFocusedState] = useState(false);

    // Post input container height (synced from SharedValue)
    const [postInputContainerHeight, setPostInputContainerHeight] = useState(0);

    // PostInput callbacks (for emoji picker integration)
    const [updateValueCallback, setUpdateValueCallback] = useState<React.Dispatch<React.SetStateAction<string>> | null>(null);
    const [updateCursorPositionCallback, setUpdateCursorPositionCallback] = useState<React.Dispatch<React.SetStateAction<number>> | null>(null);

    // Sync enabled prop with context.
    // When disabling: proactively call blurAndDismissKeyboard so the OS keyboard
    // starts dismissing, then set isEnabled=false and force-reset the state machine.
    // The force-reset is necessary on edge-to-edge Android where KEYBOARD_EVENT_END
    // arrives after isEnabled is already false, leaving the machine stuck in KEYBOARD_OPEN.
    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            if (!enabled) {
                await blurAndDismissKeyboardRef.current();
            }
            if (!cancelled) {
                stateContext.isEnabled.value = enabled;
                if (!enabled) {
                    scheduleOnUI(stateContext.forceResetToIdle);
                }
            }
        };
        run();
        return () => {
            cancelled = true;
        };

        // SharedValues are stable refs — no need in deps
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled]);

    // External event: callers outside the React tree (notifications, deep links, navigation
    // utilities, bottom sheets) emit this to dismiss the keyboard/emoji picker.
    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(
            Events.BLUR_AND_DISMISS_KEYBOARD,
            () => blurAndDismissKeyboardRef.current(),
        );
        return () => listener.remove();
    }, []);

    useEffect(() => {
        if (inputRef.current) {
            // @ts-ignore - findNodeHandle is not correctly typed to accept PasteInputRef, but it works at runtime
            const tag = findNodeHandle(inputRef.current);
            setInputTag(tag);
        }
    }, [inputRef]);

    // Setup keyboard event handlers
    useKeyboardEvents(stateContext, inputTag);

    const blurEmojiSearchIfNeeded = useCallback(() => {
        setIsEmojiSearchFocusedState(false);
    }, []);

    // Sync emoji search state with state machine
    useAnimatedReaction(
        () => stateContext.currentState.value,
        (currentState) => {
            if (currentState !== InputContainerStateType.EMOJI_SEARCH_ACTIVE) {
                scheduleOnRN(blurEmojiSearchIfNeeded);
            }
        },
        [],
    );

    // Sync postInputContainerHeight SharedValue to state
    useAnimatedReaction(
        () => stateContext.postInputContainerHeight.value,
        (height) => {
            // this is late, let's see if we can improve it later
            scheduleOnRN(setPostInputContainerHeight, height);
        },
        [],
    );

    // Setter for emoji search focus (dispatches to state machine)
    const setIsEmojiSearchFocused = useCallback((focused: boolean) => {
        const asHardwareKeyboard = Platform.OS === 'ios' && isTablet && animatedKeyboard.height.value === 0 && animatedKeyboard.state.value === 0;

        if (focused && !isEmojiSearchFocused) {
            stateMachine.onUserFocusEmojiSearch(asHardwareKeyboard);
        } else if (!focused && isEmojiSearchFocused) {
            stateMachine.onUserBlurEmojiSearch();
        }
        setTimeout(() => {
            setIsEmojiSearchFocusedState(focused);
        }, 250);
    }, [stateMachine, isEmojiSearchFocused, isTablet, animatedKeyboard]);

    // Sync showInputAccessoryView with state machine
    // Emoji picker should be shown when:
    // - EMOJI_PICKER_OPEN: Picker is fully open
    // - KEYBOARD_TO_EMOJI: Transitioning from keyboard to emoji picker (picker remains mounted)
    // - EMOJI_SEARCH_ACTIVE: Search is focused (picker + keyboard both visible)
    // - IDLE but targetHeight > 0: Animation still running (keep mounted until height reaches 0)
    // NOT shown during EMOJI_TO_KEYBOARD (picker should unmount, keyboard is opening)
    useAnimatedReaction(
        () => ({
            state: stateContext.currentState.value,
            targetHeight: stateContext.targetHeight.value,
        }),
        (current, previous) => {
            if (previous?.targetHeight === current.targetHeight && previous.state === current.state) {
                // No change in relevant values, skip reaction
                return;
            }

            const shouldShow = (
                current.state === InputContainerStateType.EMOJI_PICKER_OPEN ||
                current.state === InputContainerStateType.KEYBOARD_TO_EMOJI ||
                current.state === InputContainerStateType.EMOJI_SEARCH_ACTIVE ||
                (current.state === InputContainerStateType.IDLE && current.targetHeight > 0)
            );

            scheduleOnRN(setShowInputAccessoryView, shouldShow);
        },
        [],
    );

    // onScroll handler to track current scroll position
    const onScroll = useAnimatedScrollHandler({
        onScroll: (e) => {
            // CRITICAL FIX: We use contentInsetAdjustmentBehavior='never', so contentOffset.y does NOT
            // automatically adjust when contentInset changes. This means the formula:
            // scrollPosition = contentOffset.y + postInputTranslateY
            // is ONLY correct when contentOffset.y has been manually adjusted to compensate for contentInset.
            //
            // During keyboard transitions (IDLE -> KEYBOARD_OPENING -> KEYBOARD_OPEN):
            // - useKeyboardEvents updates postInputTranslateY (e.g., 0 -> 302)
            // - contentInset.top updates via useAnimatedProps (0 -> 302)
            // - BUT contentOffset.y stays the same (e.g., 1000) until we manually scroll it
            // - So if we calculate scrollPosition here, we get: 1000 + 302 = 1302 (WRONG!)
            // - The correct scrollPosition should stay at 1000
            //
            // FIX: During keyboard transitions, scrollPosition is managed by useKeyboardEvents
            // (it preserves the value before updating postInputTranslateY). Only update scrollPosition
            // here for real user scroll events, not for contentInset-induced onScroll events.
            //
            // We detect keyboard transitions by checking the state machine state.
            const isKeyboardTransition = (
                stateContext.currentState.value === InputContainerStateType.KEYBOARD_OPENING ||
                stateContext.isDraggingKeyboard.value || // Covers interactive keyboard drag (swipe to dismiss)
                stateContext.isEmojiPickerTransition.value || // Covers emoji picker transitions which also animate heights
                (stateContext.inputAccessoryHeight.value > 0 && stateContext.currentState.value === InputContainerStateType.IDLE) // Covers hardware keyboard case where heights don't change but we also shouldn't update scrollPosition
            );

            // Skip updating scrollPosition during keyboard transitions
            // Let useKeyboardEvents preserve it and useAnimatedReaction handle scroll compensation
            if (isKeyboardTransition || !stateContext.isEnabled.value) {
                return;
            }

            const newScrollPosition = e.contentOffset.y + stateContext.postInputTranslateY.value;

            // Preserve scrollPosition when keyboard is closed and list resets to 0
            // This prevents iOS's list reset from overwriting the preserved scroll position
            if (stateContext.postInputTranslateY.value > 0 || e.contentOffset.y > 0 || stateContext.scrollPosition.value === 0) {
                stateContext.scrollPosition.value = newScrollPosition;
            }
        },
    });

    const registerPostInputCallbacks = useCallback((
        updateValueFn: React.Dispatch<React.SetStateAction<string>>,
        updateCursorPositionFn: React.Dispatch<React.SetStateAction<number>>,
        initialValue?: string,
    ) => {
        setUpdateValueCallback((prev: typeof updateValueFn) => (prev === updateValueFn ? prev : updateValueFn));
        setUpdateCursorPositionCallback((prev: typeof updateCursorPositionFn) => (prev === updateCursorPositionFn ? prev : updateCursorPositionFn));

        // Initialize cursor position from the value passed at registration time.
        // Previously this used updateValueFn((v) => { sharedValue.value = v.length; return v; })
        // which mutates a SharedValue inside a React state-updater — Reanimated warns about that.
        // The caller passes the current draft value directly instead.
        if (initialValue !== undefined) {
            stateContext.cursorPosition.value = initialValue.length;
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const getCursorPosition = useCallback(() => {
        return stateContext.cursorPosition.value;

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const setCursorPosition = useCallback((position: number) => {
        stateContext.cursorPosition.value = position;

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const closeInputAccessoryView = useCallback(async () => {
        // Dismiss keyboard if emoji search was focused
        if (isEmojiSearchFocused) {
            dismissKeyboard();

            // Reset emoji search focus when closing emoji picker
            setIsEmojiSearchFocused(false);
        }

        // Dispatch USER_CLOSE_EMOJI event to state machine
        stateMachine.onUserCloseEmoji();

        // Wait for emoji picker close animation to complete before resolving
        await new Promise<void>((resolve) => setTimeout(resolve, 250));
    }, [isEmojiSearchFocused, setIsEmojiSearchFocused, stateMachine]);

    const blurAndDismissKeyboard = useCallback(async () => {
        // If emoji picker is showing, close it and wait for animation before returning
        if (showInputAccessoryView) {
            await closeInputAccessoryView();
            return;
        }

        await dismissKeyboard();
        inputRef.current?.blur();
    }, [showInputAccessoryView, closeInputAccessoryView, inputRef]);

    // Keep ref in sync so the enabled effect and event listener always call the latest version
    blurAndDismissKeyboardRef.current = blurAndDismissKeyboard;

    const value = useMemo(() => ({
        stateContext,
        listRef,
        inputRef,
        stateMachine,
        onScroll,
        showInputAccessoryView,
        setShowInputAccessoryView,
        isEmojiSearchFocused,
        setIsEmojiSearchFocused,
        updateValue: updateValueCallback,
        updateCursorPosition: updateCursorPositionCallback,
        registerPostInputCallbacks,
        getCursorPosition,
        setCursorPosition,
        postInputContainerHeight,
        blurAndDismissKeyboard,
        closeInputAccessoryView,

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [
        stateMachine,
        onScroll,
        showInputAccessoryView,
        setShowInputAccessoryView,
        isEmojiSearchFocused,
        setIsEmojiSearchFocused,
        updateValueCallback,
        updateCursorPositionCallback,
        registerPostInputCallbacks,
        getCursorPosition,
        setCursorPosition,
        postInputContainerHeight,
        blurAndDismissKeyboard,
        closeInputAccessoryView,
    ]);

    return (
        <KeyboardStateContext.Provider value={value}>
            {children}
        </KeyboardStateContext.Provider>
    );
}

export function useKeyboardState() {
    const context = useContext(KeyboardStateContext);

    const fallbackStateContext = useKeyboardStateContext({tabBarHeight: 0, enabled: false});
    const fallbackStateMachine = useKeyboardStateMachine(fallbackStateContext);
    const fallbackOnScroll = useAnimatedScrollHandler({});
    const fallbackListRef = useAnimatedRef<Animated.FlatList<string | PostModel>>();

    if (context) {
        return context;
    }

    return {
        stateContext: fallbackStateContext,
        listRef: fallbackListRef,
        inputRef: {current: null} as React.MutableRefObject<PasteTextInputInstance | null>,
        stateMachine: fallbackStateMachine,
        onScroll: fallbackOnScroll,
        showInputAccessoryView: false,
        setShowInputAccessoryView: () => { /* no-op */ },
        isEmojiSearchFocused: false,
        setIsEmojiSearchFocused: () => { /* no-op */ },
        updateValue: null,
        updateCursorPosition: null,
        registerPostInputCallbacks: () => { /* no-op */ },
        getCursorPosition: () => 0,
        setCursorPosition: () => { /* no-op */ },
        postInputContainerHeight: 0,
        blurAndDismissKeyboard: async () => { /* no-op */ },
        closeInputAccessoryView: async () => { /* no-op */ },
    };
}
