// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {SharedValue} from 'react-native-reanimated';

/**
 * Input container states - represents all possible states of the keyboard/emoji picker system
 */
export const InputContainerStateType = {
    IDLE: 'IDLE',
    KEYBOARD_OPENING: 'KEYBOARD_OPENING',
    KEYBOARD_OPEN: 'KEYBOARD_OPEN',
    EMOJI_PICKER_OPEN: 'EMOJI_PICKER_OPEN',
    EMOJI_TO_KEYBOARD: 'EMOJI_TO_KEYBOARD',
    KEYBOARD_TO_EMOJI: 'KEYBOARD_TO_EMOJI',
    EMOJI_SEARCH_ACTIVE: 'EMOJI_SEARCH_ACTIVE',
} as const;

export type InputContainerState = typeof InputContainerStateType[keyof typeof InputContainerStateType];

/**
 * Events that trigger state transitions
 */
export const StateMachineEventType = {
    USER_FOCUS_INPUT: 'USER_FOCUS_INPUT',
    USER_OPEN_EMOJI: 'USER_OPEN_EMOJI',
    USER_CLOSE_EMOJI: 'USER_CLOSE_EMOJI',
    USER_FOCUS_EMOJI_SEARCH: 'USER_FOCUS_EMOJI_SEARCH',
    USER_BLUR_EMOJI_SEARCH: 'USER_BLUR_EMOJI_SEARCH',
    KEYBOARD_EVENT_START: 'KEYBOARD_EVENT_START',
    KEYBOARD_EVENT_MOVE: 'KEYBOARD_EVENT_MOVE',
    KEYBOARD_EVENT_END: 'KEYBOARD_EVENT_END',
} as const;

export type StateMachineEvent = typeof StateMachineEventType[keyof typeof StateMachineEventType];

/**
 * Event payload with context
 */
export type StateEvent = {
    type: StateMachineEvent;
    height?: number; // Adjusted keyboard height (after calculateAdjustedHeight)
    rawHeight?: number; // Raw keyboard height from keyboard controller event
    progress?: number; // Keyboard animation progress (0-1)
    isRotating?: boolean;
};

/**
 * State machine context - shared state accessible to all transitions and actions
 *
 * IMPORTANT: Do NOT include mutable refs (inputRef, listRef) here!
 * StateContext is passed to worklets which freeze all properties.
 * Refs must remain mutable from JS thread and are stored separately in NewKeyboardStateContext.
 */
export type StateContext = {

    // Height tracking
    inputAccessoryHeight: SharedValue<number>;
    targetHeight: SharedValue<number>;
    keyboardEventHeight: SharedValue<number>;
    preSearchHeight: SharedValue<number>;
    lastKeyboardHeight: SharedValue<number>;
    postInputContainerHeight: SharedValue<number>;

    // Keyboard detection
    hasZeroKeyboardHeight: SharedValue<boolean>;
    isDraggingKeyboard: SharedValue<boolean>;
    isWaitingForKeyboard: SharedValue<boolean>; // True when expecting keyboard to appear (after USER_FOCUS_INPUT)

    // State (SharedValue for worklet mutations)
    // Plain objects and refs get frozen by Reanimated when passed to worklets
    // SharedValue is the only way to have mutable state in worklets
    currentState: SharedValue<InputContainerState>;

    // Guard for emoji picker transitions - blocks keyboard event handlers
    isEmojiPickerTransition: SharedValue<boolean>;
    isEmojiSearchActive: SharedValue<boolean>;

    // Reconciler pause flag - explicit control over when reconciler should sync values
    // When true, reconciler skips all syncing (used during animations, gestures, dismissals)
    isReconcilerPaused: SharedValue<boolean>;

    // Enabled flag - allows disabling keyboard event processing when screen is not focused
    isEnabled: SharedValue<boolean>;

    // Spurious event detection - tracks maximum progress to detect backwards progress
    maxKeyboardProgress: SharedValue<number>;

    // Scroll tracking
    postInputTranslateY: SharedValue<number>; // Input container position (also drives scroll padding via useAnimatedProps)
    scrollOffset: SharedValue<number>; // Scroll offset for iOS contentInset compensation
    scrollPosition: SharedValue<number>; // Current scroll position of the list

    cursorPosition: SharedValue<number>; // Current cursor position in the input

    // Height adjustments (reactive to rotation)
    tabBarHeight: SharedValue<number>; // Tab bar height (0 if not visible)
    safeAreaBottom: SharedValue<number>; // Safe area bottom inset
};

/**
 * State transition definition
 * Guards and actions now receive StateSnapshot instead of StateContext for consistent state reads
 */
export type StateTransition = {
    from: InputContainerState;
    event: StateMachineEvent;
    to: InputContainerState;
    guard?: (snapshot: StateSnapshot, event: StateEvent) => boolean;
    action?: (snapshot: StateSnapshot, event: StateEvent) => ActionUpdates | void;
};

/**
 * Describes how to update a single SharedValue
 */
export type SharedValueUpdate = {
    value: number | boolean;
    animated?: boolean;
    duration?: number; // Optional, defaults to KEYBOARD_TRANSITION_DURATION
};

/**
 * Map of SharedValue names to their updates
 * Returned by actions to describe what needs to be updated
 */
export type ActionUpdates = Partial<{
    inputAccessoryHeight: SharedValueUpdate;
    targetHeight: SharedValueUpdate;
    postInputTranslateY: SharedValueUpdate;
    scrollOffset: SharedValueUpdate;
    scrollPosition: SharedValueUpdate;
    hasZeroKeyboardHeight: SharedValueUpdate;
    isEmojiPickerTransition: SharedValueUpdate;
    isEmojiSearchActive: SharedValueUpdate;
    isDraggingKeyboard: SharedValueUpdate;
    isWaitingForKeyboard: SharedValueUpdate;
    lastKeyboardHeight: SharedValueUpdate;
    keyboardEventHeight: SharedValueUpdate;
    preSearchHeight: SharedValueUpdate;
    isReconcilerPaused: SharedValueUpdate;
}>;

/**
 * Snapshot of state values passed to guards and actions
 * Ensures consistent state across all decision points within a single processEvent execution
 */
export type StateSnapshot = {

    // Heights
    inputAccessoryHeight: number;
    targetHeight: number;
    postInputTranslateY: number;
    scrollOffset: number;
    lastKeyboardHeight: number;
    keyboardEventHeight: number;
    preSearchHeight: number;
    postInputContainerHeight: number;

    // Scroll tracking
    scrollPosition: number; // Absolute scroll position

    // Keyboard detection & flags
    hasZeroKeyboardHeight: boolean;
    isDraggingKeyboard: boolean;
    isEmojiPickerTransition: boolean;
    isEmojiSearchActive: boolean;
    isWaitingForKeyboard: boolean;

    // State
    currentState: InputContainerState;

    // Layout (reactive to rotation)
    tabBarHeight: number;
    safeAreaBottom: number;
};

/**
 * State entry/exit actions
 * Now return ActionUpdates to describe what needs to be updated
 */
export type StateAction = (snapshot: StateSnapshot, event?: StateEvent, fromState?: string) => ActionUpdates | void;
