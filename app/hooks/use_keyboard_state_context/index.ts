// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect} from 'react';
import {useSharedValue, withDelay, withTiming, type SharedValue} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {isAndroidEdgeToEdge} from '@constants/device';
import {
    InputContainerStateType,
    StateMachineEventType,
    type ActionUpdates,
    type InputContainerState,
    type SharedValueUpdate,
    type StateContext,
    type StateEvent,
    type StateSnapshot,
} from '@keyboard';
import {KEYBOARD_TRANSITION_DURATION} from '@keyboard/constants';
import {getStateEntryAction, getStateExitAction} from '@keyboard/state_machine/actions';
import {calculateAdjustedHeight} from '@keyboard/state_machine/keyboard_utils';
import {findTransition} from '@keyboard/state_machine/transitions';

type UseKeyboardStateContextConfig = {
    tabBarHeight: number;
    enabled: boolean;
};

export type KeyboardStateContextReturn = StateContext & {
    processEvent: (event: StateEvent) => void;
    isEmojiPickerActive: () => boolean;
    forceResetToIdle: () => void;
};

const DEFAULT_POST_INPUT_HEIGHT = 91;

export function useKeyboardStateContext(config: UseKeyboardStateContextConfig): KeyboardStateContextReturn {
    const safeAreaInsets = useSafeAreaInsets();

    // Height tracking SharedValues
    const inputAccessoryHeight = useSharedValue(0);
    const targetHeight = useSharedValue(0);
    const keyboardEventHeight = useSharedValue(0);
    const preSearchHeight = useSharedValue(0);

    const currentState = useSharedValue<InputContainerState>(InputContainerStateType.IDLE);

    const hasZeroKeyboardHeight = useSharedValue(false);

    const isDraggingKeyboard = useSharedValue(false);

    const isWaitingForKeyboard = useSharedValue(false);

    // Guard for emoji picker transitions - blocks keyboard event handlers
    const isEmojiPickerTransition = useSharedValue(false);
    const isEmojiSearchActive = useSharedValue(false);

    // Reconciler pause flag - explicit control over when reconciler should sync values
    const isReconcilerPaused = useSharedValue(false);

    // Enabled flag - allows disabling keyboard event processing when screen is not focused
    const isEnabled = useSharedValue(config.enabled);

    // Spurious event detection - tracks maximum progress to detect backwards progress
    const maxKeyboardProgress = useSharedValue(0);

    // Scroll adjustment SharedValues
    const postInputTranslateY = useSharedValue(0); // Input container position (also drives scroll padding)
    const scrollOffset = useSharedValue(0); // Scroll offset for iOS contentInset compensation
    const scrollPosition = useSharedValue(0); // Current scroll position of the list

    const cursorPosition = useSharedValue(0);

    // Height adjustments (reactive to rotation)
    const tabBarHeight = useSharedValue(config.tabBarHeight);
    const safeAreaBottom = useSharedValue(safeAreaInsets.bottom);

    // Last keyboard height as SharedValue (required for worklet mutations)
    const lastKeyboardHeight = useSharedValue(0);

    // Used for setting KeyboardGestureArea extra offset
    const postInputContainerHeight = useSharedValue(DEFAULT_POST_INPUT_HEIGHT);

    // Update SharedValues when config or insets change (e.g., rotation)
    useEffect(() => {
        tabBarHeight.value = config.tabBarHeight;
    }, [config.tabBarHeight, tabBarHeight]);

    // Helper: Create snapshot by reading all SharedValues
    const createStateSnapshot = (): StateSnapshot => {
        'worklet';
        return {
            inputAccessoryHeight: inputAccessoryHeight.value,
            targetHeight: targetHeight.value,
            postInputTranslateY: postInputTranslateY.value,
            scrollOffset: scrollOffset.value,
            lastKeyboardHeight: lastKeyboardHeight.value,
            keyboardEventHeight: keyboardEventHeight.value,
            preSearchHeight: preSearchHeight.value,
            postInputContainerHeight: postInputContainerHeight.value,
            scrollPosition: scrollPosition.value,
            hasZeroKeyboardHeight: hasZeroKeyboardHeight.value,
            isDraggingKeyboard: isDraggingKeyboard.value,
            isEmojiPickerTransition: isEmojiPickerTransition.value,
            isEmojiSearchActive: isEmojiSearchActive.value,
            isWaitingForKeyboard: isWaitingForKeyboard.value,
            currentState: currentState.value,
            tabBarHeight: tabBarHeight.value,
            safeAreaBottom: safeAreaBottom.value,
        };
    };

    // Helper: Apply updates to SharedValues
    const applyUpdates = (updates: ActionUpdates | void): void => {
        'worklet';
        if (!updates) {
            return;
        }

        const sharedValueMap: Record<string, SharedValue<number | boolean | string>> = {
            inputAccessoryHeight,
            targetHeight,
            postInputTranslateY,
            scrollOffset,
            lastKeyboardHeight,
            keyboardEventHeight,
            preSearchHeight,
            scrollPosition,
            hasZeroKeyboardHeight,
            isDraggingKeyboard,
            isEmojiPickerTransition,
            isEmojiSearchActive,
            isWaitingForKeyboard,
            maxKeyboardProgress,
            isReconcilerPaused,
            currentState,
        };

        for (const [key, updateValue] of Object.entries(updates)) {
            const update = updateValue as SharedValueUpdate;
            if (!update) {
                continue;
            }

            const sharedValue = sharedValueMap[key];
            if (!sharedValue || typeof sharedValue.value === 'undefined') {
                continue;
            }

            if (update.animated && typeof update.value === 'number') {
                const duration = update.duration || KEYBOARD_TRANSITION_DURATION;
                sharedValue.value = withTiming(update.value, {duration});
            } else {
                sharedValue.value = update.value;
            }
        }

    };

    // Main function: Process state machine events
    const processEvent = (event: StateEvent): void => {
        'worklet';

        // Check if keyboard event processing is enabled
        if (!isEnabled.value) {
            return;
        }

        // Read current state BEFORE preprocessing
        const currentStateValue = currentState.value;

        // Calculate adjusted height if rawHeight is provided
        if (event.rawHeight !== undefined) {
            const adjustedHeight = calculateAdjustedHeight(
                lastKeyboardHeight.value,
                tabBarHeight.value,
                safeAreaBottom.value,
                event.rawHeight,
            );

            event.height = adjustedHeight;

            const shouldSkipFakeEventCheck = isAndroidEdgeToEdge || isDraggingKeyboard.value || isEmojiSearchActive.value;

            if (!shouldSkipFakeEventCheck) {
                let currentProgress = event.progress ?? 0;
                if (currentProgress > 1) {
                    return;
                }

                if (event.type === StateMachineEventType.KEYBOARD_EVENT_START) {
                    currentProgress = 0;
                }

                const maxProgress = maxKeyboardProgress.value;
                const isKeyboardEvent = event.type === StateMachineEventType.KEYBOARD_EVENT_START ||
                    event.type === StateMachineEventType.KEYBOARD_EVENT_MOVE ||
                    event.type === StateMachineEventType.KEYBOARD_EVENT_END;

                if (isKeyboardEvent) {
                    const hasReachedCompletion = maxProgress >= 0.99;
                    const isBackwardsProgress = currentProgress <= maxProgress * 0.95;

                    if (hasReachedCompletion && isBackwardsProgress) {
                        return;
                    }
                }

                if (isKeyboardEvent && currentProgress > maxProgress) {
                    maxKeyboardProgress.value = currentProgress;
                }

                if (event.type === StateMachineEventType.KEYBOARD_EVENT_END) {
                    maxKeyboardProgress.value = withDelay(250, withTiming(0, {duration: 0}));
                }
            }

            if (event.type === StateMachineEventType.KEYBOARD_EVENT_START) {
                keyboardEventHeight.value = adjustedHeight;

                if (adjustedHeight > 75) {
                    isWaitingForKeyboard.value = false;
                }
            }

            if ((event.type === StateMachineEventType.KEYBOARD_EVENT_START ||
                event.type === StateMachineEventType.KEYBOARD_EVENT_END) &&
                !isEmojiPickerTransition.value) {
                hasZeroKeyboardHeight.value = adjustedHeight < 75;
            }
        }

        // KEYBOARD_EVENT_START specific checks
        if (event.type === StateMachineEventType.KEYBOARD_EVENT_START) {
            if (event.progress === 1 && currentStateValue === InputContainerStateType.IDLE) {
                return;
            }

            if (event.rawHeight === 0 && currentStateValue === InputContainerStateType.IDLE) {
                event.type = StateMachineEventType.KEYBOARD_EVENT_END;
            }
        }

        // During emoji picker transitions, block most keyboard events
        if (isEmojiPickerTransition.value && !event.type.startsWith('USER_')) {
            const {type} = event;

            const allowedStatesForEnd = (
                currentStateValue === InputContainerStateType.KEYBOARD_TO_EMOJI ||
                currentStateValue === InputContainerStateType.EMOJI_TO_KEYBOARD ||
                currentStateValue === InputContainerStateType.EMOJI_SEARCH_ACTIVE ||
                currentStateValue === InputContainerStateType.EMOJI_PICKER_OPEN
            );

            const allowStartForHeightCapture = type === StateMachineEventType.KEYBOARD_EVENT_START &&
                currentStateValue === InputContainerStateType.EMOJI_PICKER_OPEN;

            const allowEnd = type === StateMachineEventType.KEYBOARD_EVENT_END && allowedStatesForEnd;

            const allowedEmojiStateForStartOrMove = currentStateValue === InputContainerStateType.EMOJI_TO_KEYBOARD ||
                currentStateValue === InputContainerStateType.EMOJI_SEARCH_ACTIVE ||
                currentStateValue === InputContainerStateType.EMOJI_PICKER_OPEN;

            const allowMove = type === StateMachineEventType.KEYBOARD_EVENT_MOVE && allowedEmojiStateForStartOrMove;
            const allowStart = type === StateMachineEventType.KEYBOARD_EVENT_START && allowedEmojiStateForStartOrMove;

            if (!allowEnd && !allowMove && !allowStart && !allowStartForHeightCapture) {
                return;
            }
        }

        const snapshot = createStateSnapshot();
        const eventType = event.type;

        const transition = findTransition(snapshot.currentState, eventType, snapshot, event);

        if (!transition) {
            return;
        }

        const nextState = transition.to;

        if (transition.guard && !transition.guard(snapshot, event)) {
            return;
        }

        try {
            currentState.value = nextState;

            const exitAction = getStateExitAction(snapshot.currentState, nextState);
            if (exitAction) {
                const exitUpdates = exitAction(snapshot, event);
                applyUpdates(exitUpdates);
            }

            if (transition.action) {
                const transitionUpdates = transition.action(snapshot, event);
                applyUpdates(transitionUpdates);
            }

            // Entry action runs LAST so it has final authority over the target state's flags.
            // Transition actions may set flags needed during the transition (e.g. isEmojiPickerTransition=true
            // in EMOJI_PICKER_OPEN→IDLE to protect scroll offset while heights animate to 0), but the
            // entry action of the target state must be able to override them (e.g. enterIdle clears
            // isEmojiPickerTransition so subsequent keyboard events are not blocked in IDLE).
            // Entry actions use the immutable snapshot for their logic, so running after the transition
            // action does not affect their computations.
            if (snapshot.currentState !== nextState) {
                const entryAction = getStateEntryAction(nextState);
                if (entryAction) {
                    const entryUpdates = entryAction(snapshot, event, snapshot.currentState);
                    applyUpdates(entryUpdates);
                }
            }
        } catch (error) {
            currentState.value = snapshot.currentState;
        }

    };

    // Check if emoji picker is active
    const isEmojiPickerActiveFunc = (): boolean => {
        'worklet';
        const state = currentState.value;
        return state === InputContainerStateType.EMOJI_PICKER_OPEN ||
            state === InputContainerStateType.KEYBOARD_TO_EMOJI ||
            state === InputContainerStateType.EMOJI_TO_KEYBOARD ||
            state === InputContainerStateType.EMOJI_SEARCH_ACTIVE;

    };

    // Force the state machine to IDLE regardless of current state.
    // Called when the keyboard context is disabled (screen navigates away) to ensure
    // the machine doesn't stay stuck in KEYBOARD_OPEN if the dismiss animation events
    // arrive after isEnabled is already false (common on edge-to-edge Android).
    const forceResetToIdle = (): void => {
        'worklet';
        if (currentState.value === InputContainerStateType.IDLE) {
            return;
        }

        currentState.value = InputContainerStateType.IDLE;

        // Reset all height/position values
        targetHeight.value = 0;
        postInputTranslateY.value = 0;
        inputAccessoryHeight.value = 0;

        // Reset flags
        isReconcilerPaused.value = false;
        isWaitingForKeyboard.value = false;
        isEmojiPickerTransition.value = false;
        isEmojiSearchActive.value = false;
        isDraggingKeyboard.value = false;
        maxKeyboardProgress.value = 0;
        hasZeroKeyboardHeight.value = false;
    };

    // Return all SharedValues + functions
    return {

        // SharedValues
        inputAccessoryHeight,
        targetHeight,
        keyboardEventHeight,
        preSearchHeight,
        lastKeyboardHeight,
        postInputContainerHeight,
        hasZeroKeyboardHeight,
        isDraggingKeyboard,
        isWaitingForKeyboard,
        currentState,
        isEmojiPickerTransition,
        isEmojiSearchActive,
        isReconcilerPaused,
        isEnabled,
        maxKeyboardProgress,
        postInputTranslateY,
        scrollOffset,
        scrollPosition,
        cursorPosition,
        tabBarHeight,
        safeAreaBottom,

        // Functions
        processEvent,
        isEmojiPickerActive: isEmojiPickerActiveFunc,
        forceResetToIdle,
    };
}
