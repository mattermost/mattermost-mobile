// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import {act, renderHook} from '@testing-library/react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {InputContainerStateType, StateMachineEventType} from '@keyboard';
import {KEYBOARD_TRANSITION_DURATION} from '@keyboard/constants';

import {useKeyboardStateContext} from './index';

jest.mock('@constants/device', () => ({
    isAndroidEdgeToEdge: false,
    isEdgeToEdge: false,
}));

jest.mock('react-native-safe-area-context', () => ({
    useSafeAreaInsets: jest.fn(() => ({bottom: 0, top: 0, left: 0, right: 0})),
}));

// Deterministic reanimated: withTiming calls callback, withDelay is a passthrough
jest.mock('react-native-reanimated', () => ({
    ...jest.requireActual('react-native-reanimated'),
    withTiming: (toValue: number, _config?: unknown, callback?: (finished: boolean) => void) => {
        callback?.(true);
        return toValue;
    },
    withDelay: (_delay: number, animation: unknown) => animation,
    useSharedValue: <T>(init: T) => ({value: init}),
}));

// Mock the state machine building blocks so processEvent is deterministic
const mockCalculateAdjustedHeight = jest.fn((lastH: number, tabH: number, safeH: number, raw: number) => Math.max(0, raw - tabH - safeH));
const mockFindTransition = jest.fn();
const mockGetStateEntryAction = jest.fn() as jest.Mock<unknown, [unknown]>;
const mockGetStateExitAction = jest.fn() as jest.Mock<unknown, [unknown]>;

jest.mock('@keyboard/state_machine/keyboard_utils', () => ({
    calculateAdjustedHeight: (...args: unknown[]) => mockCalculateAdjustedHeight(...args as [number, number, number, number]),
    calculateKeyboardUpdates: jest.fn(),
    getEmojiSearchActiveHeight: jest.fn(),
}));

jest.mock('@keyboard/state_machine/transitions', () => ({
    findTransition: (state: unknown, event: unknown, snapshot: unknown, context: unknown) =>
        mockFindTransition(state, event, snapshot, context),
}));

jest.mock('@keyboard/state_machine/actions', () => ({
    getStateEntryAction: (state: unknown) => mockGetStateEntryAction(state),
    getStateExitAction: (state: unknown) => mockGetStateExitAction(state),
}));

function makeTransition(to: string, opts: {guard?: jest.Mock; action?: jest.Mock} = {}) {
    return {from: InputContainerStateType.IDLE, event: StateMachineEventType.KEYBOARD_EVENT_START, to, ...opts};
}

function renderContext(config: {tabBarHeight?: number; enabled?: boolean} = {}) {
    const {tabBarHeight = 49, enabled = true} = config;
    const {result} = renderHook(() => useKeyboardStateContext({tabBarHeight, enabled}));
    return result;
}

describe('useKeyboardStateContext', () => {
    beforeEach(() => {
        jest.useFakeTimers({doNotFake: ['nextTick']});
        jest.clearAllMocks();
        mockFindTransition.mockReturnValue(undefined);
        mockGetStateEntryAction.mockReturnValue(undefined);
        mockGetStateExitAction.mockReturnValue(undefined);
        jest.mocked(useSafeAreaInsets).mockReturnValue({bottom: 0, top: 0, left: 0, right: 0});
    });

    afterEach(() => {
        act(() => {
            jest.runAllTimers();
        });
        jest.useRealTimers();
    });

    describe('initial shared values', () => {
        it('should initialize currentState to IDLE', () => {
            const result = renderContext();
            expect(result.current.currentState.value).toBe(InputContainerStateType.IDLE);
        });

        it('should initialize isEnabled from the enabled config prop', () => {
            const result = renderContext({enabled: true});
            expect(result.current.isEnabled.value).toBe(true);
        });

        it('should initialize isEnabled=false when enabled=false', () => {
            const result = renderContext({enabled: false});
            expect(result.current.isEnabled.value).toBe(false);
        });

        it('should initialize tabBarHeight shared value from config', () => {
            const result = renderContext({tabBarHeight: 60});
            expect(result.current.tabBarHeight.value).toBe(60);
        });

        it('should initialize safeAreaBottom from useSafeAreaInsets', () => {
            jest.mocked(useSafeAreaInsets).mockReturnValue({bottom: 34, top: 44, left: 0, right: 0});
            const result = renderContext();
            expect(result.current.safeAreaBottom.value).toBe(34);
        });
    });

    describe('useEffect: tabBarHeight sync', () => {
        it('should update tabBarHeight shared value when config.tabBarHeight changes', () => {
            const {result, rerender} = renderHook(
                ({tabBarHeight}: {tabBarHeight: number}) =>
                    useKeyboardStateContext({tabBarHeight, enabled: true}),
                {initialProps: {tabBarHeight: 49}},
            );

            expect(result.current.tabBarHeight.value).toBe(49);

            act(() => {
                rerender({tabBarHeight: 60});
            });

            expect(result.current.tabBarHeight.value).toBe(60);
        });
    });

    describe('useEffect: isEnabled sync', () => {
        it('should update isEnabled shared value when config.enabled changes', () => {
            const {result, rerender} = renderHook(
                ({enabled}: {enabled: boolean}) =>
                    useKeyboardStateContext({tabBarHeight: 49, enabled}),
                {initialProps: {enabled: true}},
            );

            act(() => {
                rerender({enabled: false});
            });

            expect(result.current.isEnabled.value).toBe(false);
        });
    });

    describe('processEvent: disabled guard', () => {
        it('should not process events when isEnabled=false', () => {
            const result = renderContext({enabled: false});

            act(() => {
                result.current.processEvent({
                    type: StateMachineEventType.KEYBOARD_EVENT_START,
                    rawHeight: 300,
                    progress: 0,
                });
            });

            expect(mockFindTransition).not.toHaveBeenCalled();
        });
    });

    describe('processEvent: rawHeight calculation', () => {
        it('should call calculateAdjustedHeight when rawHeight is provided', () => {
            const result = renderContext();

            act(() => {
                result.current.processEvent({
                    type: StateMachineEventType.KEYBOARD_EVENT_START,
                    rawHeight: 300,
                    progress: 0,
                });
            });

            expect(mockCalculateAdjustedHeight).toHaveBeenCalledWith(0, 49, 0, 300);
        });

        it('should not call calculateAdjustedHeight when rawHeight is undefined', () => {
            const result = renderContext();

            act(() => {
                result.current.processEvent({
                    type: StateMachineEventType.USER_FOCUS_INPUT,
                });
            });

            expect(mockCalculateAdjustedHeight).not.toHaveBeenCalled();
        });

        it('should default progress to 0 when event.progress is undefined', () => {
            mockFindTransition.mockReturnValue(makeTransition(InputContainerStateType.KEYBOARD_OPENING));
            const result = renderContext();

            // progress is omitted — should not throw and should reach findTransition
            act(() => {
                result.current.processEvent({
                    type: StateMachineEventType.KEYBOARD_EVENT_MOVE,
                    rawHeight: 300,
                });
            });

            expect(mockFindTransition).toHaveBeenCalled();
        });

        it('should process non-keyboard events with rawHeight without updating maxKeyboardProgress', () => {
            mockFindTransition.mockReturnValue(makeTransition(InputContainerStateType.KEYBOARD_OPENING));
            const result = renderContext();

            act(() => {
                result.current.processEvent({
                    type: StateMachineEventType.USER_FOCUS_INPUT,
                    rawHeight: 300,
                    progress: 0.5,
                });
            });

            // maxKeyboardProgress should NOT be updated for USER_* events
            expect(result.current.maxKeyboardProgress.value).toBe(0);
        });

        it('should skip fake events when progress > 1', () => {
            const result = renderContext();
            mockFindTransition.mockReturnValue(makeTransition(InputContainerStateType.KEYBOARD_OPENING));

            act(() => {
                result.current.processEvent({
                    type: StateMachineEventType.KEYBOARD_EVENT_MOVE,
                    rawHeight: 300,
                    progress: 1.5,
                });
            });

            expect(mockFindTransition).not.toHaveBeenCalled();
        });

        it('should update maxKeyboardProgress when progress advances', () => {
            const result = renderContext();

            act(() => {
                result.current.processEvent({
                    type: StateMachineEventType.KEYBOARD_EVENT_MOVE,
                    rawHeight: 300,
                    progress: 0.5,
                });
            });

            expect(result.current.maxKeyboardProgress.value).toBe(0.5);
        });

        it('should reset maxKeyboardProgress via withDelay on KEYBOARD_EVENT_END', () => {
            const result = renderContext();

            act(() => {
                result.current.processEvent({
                    type: StateMachineEventType.KEYBOARD_EVENT_END,
                    rawHeight: 300,
                    progress: 1,
                });
            });

            expect(result.current.maxKeyboardProgress.value).toBe(0);
        });

        it('should block spurious backwards-progress events after keyboard fully opened', () => {
            const result = renderContext();
            mockFindTransition.mockReturnValue(makeTransition(InputContainerStateType.KEYBOARD_OPENING));

            // Advance to near-complete progress
            act(() => {
                result.current.processEvent({
                    type: StateMachineEventType.KEYBOARD_EVENT_MOVE,
                    rawHeight: 300,
                    progress: 1.0,
                });
            });

            mockFindTransition.mockClear();

            // Backwards progress event (well below maxProgress * 0.95)
            act(() => {
                result.current.processEvent({
                    type: StateMachineEventType.KEYBOARD_EVENT_MOVE,
                    rawHeight: 300,
                    progress: 0.1,
                });
            });

            expect(mockFindTransition).not.toHaveBeenCalled();
        });
    });

    describe('processEvent: KEYBOARD_EVENT_START special cases', () => {
        it('should update keyboardEventHeight on KEYBOARD_EVENT_START', () => {
            mockCalculateAdjustedHeight.mockReturnValue(250);
            const result = renderContext();

            act(() => {
                result.current.processEvent({
                    type: StateMachineEventType.KEYBOARD_EVENT_START,
                    rawHeight: 300,
                    progress: 0,
                });
            });

            expect(result.current.keyboardEventHeight.value).toBe(250);
        });

        it('should set isWaitingForKeyboard=false when adjustedHeight > 75', () => {
            mockCalculateAdjustedHeight.mockReturnValue(300);
            const result = renderContext();
            result.current.isWaitingForKeyboard.value = true;

            act(() => {
                result.current.processEvent({
                    type: StateMachineEventType.KEYBOARD_EVENT_START,
                    rawHeight: 300,
                    progress: 0,
                });
            });

            expect(result.current.isWaitingForKeyboard.value).toBe(false);
        });

        it('should return early when progress=1 and currentState=IDLE', () => {
            const result = renderContext();

            act(() => {
                result.current.processEvent({
                    type: StateMachineEventType.KEYBOARD_EVENT_START,
                    rawHeight: 300,
                    progress: 1,
                });
            });

            expect(mockFindTransition).not.toHaveBeenCalled();
        });

        it('should rewrite event type to KEYBOARD_EVENT_END when rawHeight=0 and state=IDLE', () => {
            mockFindTransition.mockReturnValue(makeTransition(InputContainerStateType.IDLE));
            const result = renderContext();

            act(() => {
                result.current.processEvent({
                    type: StateMachineEventType.KEYBOARD_EVENT_START,
                    rawHeight: 0,
                    progress: 0,
                });
            });

            expect(mockFindTransition).toHaveBeenCalledWith(
                InputContainerStateType.IDLE,
                StateMachineEventType.KEYBOARD_EVENT_END,
                expect.anything(),
                expect.anything(),
            );
        });

        it('should update hasZeroKeyboardHeight=true when adjustedHeight < 75 on KEYBOARD_EVENT_START', () => {
            mockCalculateAdjustedHeight.mockReturnValue(50);
            const result = renderContext();

            act(() => {
                result.current.processEvent({
                    type: StateMachineEventType.KEYBOARD_EVENT_START,
                    rawHeight: 50,
                    progress: 0,
                });
            });

            expect(result.current.hasZeroKeyboardHeight.value).toBe(true);
        });

        it('should update hasZeroKeyboardHeight=false when adjustedHeight >= 75 on KEYBOARD_EVENT_END', () => {
            mockCalculateAdjustedHeight.mockReturnValue(300);
            const result = renderContext();
            result.current.hasZeroKeyboardHeight.value = true;

            act(() => {
                result.current.processEvent({
                    type: StateMachineEventType.KEYBOARD_EVENT_END,
                    rawHeight: 300,
                    progress: 1,
                });
            });

            expect(result.current.hasZeroKeyboardHeight.value).toBe(false);
        });

        it('should NOT update hasZeroKeyboardHeight when isEmojiPickerTransition=true', () => {
            mockCalculateAdjustedHeight.mockReturnValue(50);
            const result = renderContext();
            result.current.isEmojiPickerTransition.value = true;

            act(() => {
                result.current.processEvent({
                    type: StateMachineEventType.KEYBOARD_EVENT_START,
                    rawHeight: 50,
                    progress: 0,
                });
            });

            expect(result.current.hasZeroKeyboardHeight.value).toBe(false);
        });
    });

    describe('processEvent: emoji picker transition gate', () => {
        function setupTransitionGuard(state: string) {
            const result = renderContext();
            result.current.currentState.value = state as never;
            result.current.isEmojiPickerTransition.value = true;
            return result;
        }

        it('should allow USER_* events even during emoji picker transition', () => {
            const result = setupTransitionGuard(InputContainerStateType.EMOJI_PICKER_OPEN);
            mockFindTransition.mockReturnValue(makeTransition(InputContainerStateType.IDLE));

            act(() => {
                result.current.processEvent({type: StateMachineEventType.USER_FOCUS_INPUT});
            });

            expect(mockFindTransition).toHaveBeenCalled();
        });

        it('should block KEYBOARD_EVENT_MOVE in IDLE during emoji picker transition', () => {
            const result = setupTransitionGuard(InputContainerStateType.IDLE);

            act(() => {
                result.current.processEvent({
                    type: StateMachineEventType.KEYBOARD_EVENT_MOVE,
                    rawHeight: 300,
                    progress: 0.5,
                });
            });

            expect(mockFindTransition).not.toHaveBeenCalled();
        });

        it('should allow KEYBOARD_EVENT_END in KEYBOARD_TO_EMOJI during transition', () => {
            const result = setupTransitionGuard(InputContainerStateType.KEYBOARD_TO_EMOJI);
            mockFindTransition.mockReturnValue(makeTransition(InputContainerStateType.EMOJI_PICKER_OPEN));

            act(() => {
                result.current.processEvent({
                    type: StateMachineEventType.KEYBOARD_EVENT_END,
                    rawHeight: 300,
                    progress: 1,
                });
            });

            expect(mockFindTransition).toHaveBeenCalled();
        });

        it('should allow KEYBOARD_EVENT_MOVE in EMOJI_TO_KEYBOARD during transition', () => {
            const result = setupTransitionGuard(InputContainerStateType.EMOJI_TO_KEYBOARD);
            mockFindTransition.mockReturnValue(makeTransition(InputContainerStateType.KEYBOARD_OPEN));

            act(() => {
                result.current.processEvent({
                    type: StateMachineEventType.KEYBOARD_EVENT_MOVE,
                    rawHeight: 300,
                    progress: 0.5,
                });
            });

            expect(mockFindTransition).toHaveBeenCalled();
        });

        it('should allow KEYBOARD_EVENT_START in EMOJI_PICKER_OPEN for height capture during transition', () => {
            const result = setupTransitionGuard(InputContainerStateType.EMOJI_PICKER_OPEN);
            mockFindTransition.mockReturnValue(makeTransition(InputContainerStateType.EMOJI_PICKER_OPEN));

            act(() => {
                result.current.processEvent({
                    type: StateMachineEventType.KEYBOARD_EVENT_START,
                    rawHeight: 300,
                    progress: 0,
                });
            });

            expect(mockFindTransition).toHaveBeenCalled();
        });

        it('should allow KEYBOARD_EVENT_START in EMOJI_SEARCH_ACTIVE during transition', () => {
            const result = setupTransitionGuard(InputContainerStateType.EMOJI_SEARCH_ACTIVE);
            mockFindTransition.mockReturnValue(makeTransition(InputContainerStateType.EMOJI_SEARCH_ACTIVE));

            act(() => {
                result.current.processEvent({
                    type: StateMachineEventType.KEYBOARD_EVENT_START,
                    rawHeight: 300,
                    progress: 0,
                });
            });

            expect(mockFindTransition).toHaveBeenCalled();
        });
    });

    describe('processEvent: transition execution', () => {
        it('should not change state when no transition is found', () => {
            mockFindTransition.mockReturnValue(undefined);
            const result = renderContext();

            act(() => {
                result.current.processEvent({type: StateMachineEventType.USER_FOCUS_INPUT});
            });

            expect(result.current.currentState.value).toBe(InputContainerStateType.IDLE);
        });

        it('should advance currentState to transition.to when transition is found', () => {
            const result = renderContext();
            mockFindTransition.mockReturnValue(makeTransition(InputContainerStateType.KEYBOARD_OPENING));

            act(() => {
                result.current.processEvent({type: StateMachineEventType.USER_FOCUS_INPUT});
            });

            expect(result.current.currentState.value).toBe(InputContainerStateType.KEYBOARD_OPENING);
        });

        it('should not advance state when transition guard returns false', () => {
            const guard = jest.fn(() => false);
            mockFindTransition.mockReturnValue(makeTransition(InputContainerStateType.KEYBOARD_OPENING, {guard}));
            const result = renderContext();

            act(() => {
                result.current.processEvent({type: StateMachineEventType.USER_FOCUS_INPUT});
            });

            expect(result.current.currentState.value).toBe(InputContainerStateType.IDLE);
        });

        it('should execute exit action on state transition', () => {
            const exitAction = jest.fn(() => ({inputAccessoryHeight: {value: 0, animated: false}}));
            mockGetStateExitAction.mockReturnValue(exitAction);
            mockFindTransition.mockReturnValue(makeTransition(InputContainerStateType.KEYBOARD_OPENING));
            const result = renderContext();

            act(() => {
                result.current.processEvent({type: StateMachineEventType.USER_FOCUS_INPUT});
            });

            expect(exitAction).toHaveBeenCalledTimes(1);
        });

        it('should execute transition action', () => {
            const transitionAction = jest.fn(() => ({targetHeight: {value: 300, animated: false}}));
            mockFindTransition.mockReturnValue(makeTransition(InputContainerStateType.KEYBOARD_OPENING, {action: transitionAction}));
            const result = renderContext();

            act(() => {
                result.current.processEvent({type: StateMachineEventType.USER_FOCUS_INPUT});
            });

            expect(transitionAction).toHaveBeenCalledTimes(1);
        });

        it('should execute entry action when state actually changes', () => {
            const entryAction = jest.fn(() => ({isWaitingForKeyboard: {value: true, animated: false}}));
            mockGetStateEntryAction.mockReturnValue(entryAction);
            mockFindTransition.mockReturnValue(makeTransition(InputContainerStateType.KEYBOARD_OPENING));
            const result = renderContext();

            act(() => {
                result.current.processEvent({type: StateMachineEventType.USER_FOCUS_INPUT});
            });

            expect(entryAction).toHaveBeenCalledTimes(1);
        });

        it('should apply updates from transition action to shared values', () => {
            const transitionAction = jest.fn(() => ({
                inputAccessoryHeight: {value: 300, animated: false},
            }));
            mockFindTransition.mockReturnValue(makeTransition(InputContainerStateType.KEYBOARD_OPENING, {action: transitionAction}));
            const result = renderContext();

            act(() => {
                result.current.processEvent({type: StateMachineEventType.USER_FOCUS_INPUT});
            });

            expect(result.current.inputAccessoryHeight.value).toBe(300);
        });

        it('should apply animated updates via withTiming when animated=true', () => {
            const transitionAction = jest.fn(() => ({
                inputAccessoryHeight: {value: 400, animated: true},
            }));
            mockFindTransition.mockReturnValue(makeTransition(InputContainerStateType.KEYBOARD_OPENING, {action: transitionAction}));
            const result = renderContext();

            act(() => {
                result.current.processEvent({type: StateMachineEventType.USER_FOCUS_INPUT});
            });

            expect(result.current.inputAccessoryHeight.value).toBe(400);
        });

        it('should use custom duration when update.duration is provided', () => {
            const transitionAction = jest.fn(() => ({
                inputAccessoryHeight: {value: 400, animated: true, duration: 500},
            }));
            mockFindTransition.mockReturnValue(makeTransition(InputContainerStateType.KEYBOARD_OPENING, {action: transitionAction}));
            const result = renderContext();

            act(() => {
                result.current.processEvent({type: StateMachineEventType.USER_FOCUS_INPUT});
            });

            expect(result.current.inputAccessoryHeight.value).toBe(400);
        });

        it('should fall back to KEYBOARD_TRANSITION_DURATION when duration is not provided', () => {
            // Spy on withTiming to verify the correct default duration is used
            const Reanimated = require('react-native-reanimated');
            const withTimingSpy = jest.spyOn(Reanimated, 'withTiming');

            const transitionAction = jest.fn(() => ({
                inputAccessoryHeight: {value: 400, animated: true},
            }));
            mockFindTransition.mockReturnValue(makeTransition(InputContainerStateType.KEYBOARD_OPENING, {action: transitionAction}));
            const result = renderContext();

            act(() => {
                result.current.processEvent({type: StateMachineEventType.USER_FOCUS_INPUT});
            });

            expect(withTimingSpy).toHaveBeenCalledWith(400, {duration: KEYBOARD_TRANSITION_DURATION});
            withTimingSpy.mockRestore();
        });

        it('should recover currentState on action error', () => {
            const entryAction = jest.fn(() => {
                throw new Error('action failed');
            });
            mockGetStateEntryAction.mockReturnValue(entryAction);
            mockFindTransition.mockReturnValue(makeTransition(InputContainerStateType.KEYBOARD_OPENING));
            const result = renderContext();

            act(() => {
                result.current.processEvent({type: StateMachineEventType.USER_FOCUS_INPUT});
            });

            expect(result.current.currentState.value).toBe(InputContainerStateType.IDLE);
        });
    });

    describe('applyUpdates: edge cases', () => {
        it('should skip unknown keys in updates silently', () => {
            const transitionAction = jest.fn(() => ({
                unknownKey: {value: 999, animated: false},
            }));
            mockFindTransition.mockReturnValue(makeTransition(InputContainerStateType.KEYBOARD_OPENING, {action: transitionAction}));
            const result = renderContext();

            expect(() => {
                act(() => {
                    result.current.processEvent({type: StateMachineEventType.USER_FOCUS_INPUT});
                });
            }).not.toThrow();
        });

        it('should skip null/falsy update entries', () => {
            const transitionAction = jest.fn(() => ({
                inputAccessoryHeight: null,
                targetHeight: {value: 100, animated: false},
            }));
            mockFindTransition.mockReturnValue(makeTransition(InputContainerStateType.KEYBOARD_OPENING, {action: transitionAction as never}));
            const result = renderContext();

            act(() => {
                result.current.processEvent({type: StateMachineEventType.USER_FOCUS_INPUT});
            });

            expect(result.current.targetHeight.value).toBe(100);
        });

        it('should not apply updates when action returns undefined', () => {
            const transitionAction = jest.fn(() => undefined);
            mockFindTransition.mockReturnValue(makeTransition(InputContainerStateType.KEYBOARD_OPENING, {action: transitionAction as never}));
            const result = renderContext();

            expect(() => {
                act(() => {
                    result.current.processEvent({type: StateMachineEventType.USER_FOCUS_INPUT});
                });
            }).not.toThrow();
        });
    });

    describe('isEmojiPickerActive', () => {
        it.each([
            InputContainerStateType.EMOJI_PICKER_OPEN,
            InputContainerStateType.KEYBOARD_TO_EMOJI,
            InputContainerStateType.EMOJI_TO_KEYBOARD,
            InputContainerStateType.EMOJI_SEARCH_ACTIVE,
        ])('should return true when state is %s', (state) => {
            const result = renderContext();
            result.current.currentState.value = state as never;

            expect(result.current.isEmojiPickerActive()).toBe(true);
        });

        it.each([
            InputContainerStateType.IDLE,
            InputContainerStateType.KEYBOARD_OPENING,
            InputContainerStateType.KEYBOARD_OPEN,
        ])('should return false when state is %s', (state) => {
            const result = renderContext();
            result.current.currentState.value = state as never;

            expect(result.current.isEmojiPickerActive()).toBe(false);
        });
    });

    describe('processEvent: edge-to-edge skips fake-event filter', () => {
        it('should not filter backwards-progress events on edge-to-edge', () => {
            const deviceModule = require('@constants/device');
            deviceModule.isAndroidEdgeToEdge = true;

            mockFindTransition.mockReturnValue(makeTransition(InputContainerStateType.KEYBOARD_OPENING));
            const result = renderContext();

            // First: reach max progress
            act(() => {
                result.current.processEvent({
                    type: StateMachineEventType.KEYBOARD_EVENT_MOVE,
                    rawHeight: 300,
                    progress: 1.0,
                });
            });

            mockFindTransition.mockClear();

            // Backwards event — should NOT be filtered on edge-to-edge
            act(() => {
                result.current.processEvent({
                    type: StateMachineEventType.KEYBOARD_EVENT_MOVE,
                    rawHeight: 300,
                    progress: 0.1,
                });
            });

            expect(mockFindTransition).toHaveBeenCalled();

            deviceModule.isAndroidEdgeToEdge = false;
        });
    });
});
