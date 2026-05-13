// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook} from '@testing-library/react-native';
import {useKeyboardHandler} from 'react-native-keyboard-controller';

import {StateMachineEventType, InputContainerStateType, type InputContainerState} from '@keyboard';

import {useKeyboardEvents} from './index';

// isAndroidEdgeToEdge is a module-level constant — mock the whole module
jest.mock('@constants/device', () => ({
    isAndroidEdgeToEdge: false,
    isEdgeToEdge: false,
}));

jest.mock('react-native-keyboard-controller', () => ({
    useKeyboardHandler: jest.fn(),
    useReanimatedFocusedInput: jest.fn(() => ({input: {value: null}})),
}));

// makeMutable must return a proper {value} object so the isRotating/wasRotating
// shared values work when handler bodies execute synchronously in Jest.
jest.mock('react-native-reanimated', () => ({
    ...jest.requireActual('react-native-reanimated'),
    makeMutable: <T>(init: T) => ({value: init}),
    useSharedValue: <T>(init: T) => ({value: init}),
}));

type KeyboardEvent = {height: number; progress: number; target?: number | null};

/**
 * Renders the hook and returns the handlers captured from useKeyboardHandler.
 * The mock captures whatever object is passed to useKeyboardHandler on render.
 */
function renderAndCapture(
    context: ReturnType<typeof makeContext>,
    inputTag: number | null = 1,
) {
    let capturedHandlers: Record<string, (e: KeyboardEvent) => void> = {};

    jest.mocked(useKeyboardHandler).mockImplementation((handlers) => {
        capturedHandlers = handlers as typeof capturedHandlers;
    });

    renderHook(() => useKeyboardEvents(context as never, inputTag));

    return capturedHandlers;
}

function makeContext(overrides: Partial<{
    currentStateValue: InputContainerState;
    isDraggingKeyboard: boolean;
    isReconcilerPaused: boolean;
}> = {}) {
    const processEvent = jest.fn();
    const context = {
        processEvent,
        isDraggingKeyboard: {value: overrides.isDraggingKeyboard ?? false},
        isReconcilerPaused: {value: overrides.isReconcilerPaused ?? false},
        currentState: {value: overrides.currentStateValue ?? InputContainerStateType.IDLE},
        isEnabled: {value: true},
    };
    return context;
}

describe('useKeyboardEvents', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('onStart', () => {
        it('should reset isDraggingKeyboard and isReconcilerPaused to false', () => {
            const ctx = makeContext({isDraggingKeyboard: true, isReconcilerPaused: true});
            const handlers = renderAndCapture(ctx);

            handlers.onStart({height: 300, progress: 0, target: 1});

            expect(ctx.isDraggingKeyboard.value).toBe(false);
            expect(ctx.isReconcilerPaused.value).toBe(false);
        });

        it('should dispatch USER_FOCUS_INPUT when focusedInputTag matches inputTag', () => {
            const ctx = makeContext();
            const handlers = renderAndCapture(ctx, 1);

            handlers.onStart({height: 300, progress: 0, target: 1});

            expect(ctx.processEvent).toHaveBeenCalledWith(
                expect.objectContaining({type: StateMachineEventType.USER_FOCUS_INPUT}),
            );
        });

        it('should NOT dispatch USER_FOCUS_INPUT when focusedInputTag does not match inputTag', () => {
            const ctx = makeContext();
            const handlers = renderAndCapture(ctx, 1);

            handlers.onStart({height: 300, progress: 0, target: 99});

            expect(ctx.processEvent).not.toHaveBeenCalledWith(
                expect.objectContaining({type: StateMachineEventType.USER_FOCUS_INPUT}),
            );
        });

        it('should NOT dispatch USER_FOCUS_INPUT when inputTag is null', () => {
            const ctx = makeContext();
            const handlers = renderAndCapture(ctx, null);

            handlers.onStart({height: 300, progress: 0, target: 1});

            expect(ctx.processEvent).not.toHaveBeenCalledWith(
                expect.objectContaining({type: StateMachineEventType.USER_FOCUS_INPUT}),
            );
        });

        it('should dispatch KEYBOARD_EVENT_START with height and progress', () => {
            const ctx = makeContext();
            const handlers = renderAndCapture(ctx, null);

            handlers.onStart({height: 300, progress: 0.5, target: 1});

            expect(ctx.processEvent).toHaveBeenCalledWith({
                type: StateMachineEventType.KEYBOARD_EVENT_START,
                rawHeight: 300,
                progress: 0.5,
            });
        });

        it('should set isRotating=true and return early when state=KEYBOARD_OPEN and height=0 and progress=0 and target matches', () => {
            const ctx = makeContext({currentStateValue: InputContainerStateType.KEYBOARD_OPEN});
            const handlers = renderAndCapture(ctx, 1);

            handlers.onStart({height: 0, progress: 0, target: 1});

            // KEYBOARD_EVENT_START should NOT be dispatched — early return after isRotating set
            expect(ctx.processEvent).not.toHaveBeenCalledWith(
                expect.objectContaining({type: StateMachineEventType.KEYBOARD_EVENT_START}),
            );
        });

        it('should still dispatch KEYBOARD_EVENT_START when state=KEYBOARD_OPEN but height>0', () => {
            const ctx = makeContext({currentStateValue: InputContainerStateType.KEYBOARD_OPEN});
            const handlers = renderAndCapture(ctx, 1);

            handlers.onStart({height: 300, progress: 0, target: 1});

            expect(ctx.processEvent).toHaveBeenCalledWith(
                expect.objectContaining({type: StateMachineEventType.KEYBOARD_EVENT_START}),
            );
        });

        it('should use input.value.target (from useReanimatedFocusedInput) as focusedInputTag on edge-to-edge', () => {
            const {useReanimatedFocusedInput} = require('react-native-keyboard-controller');
            jest.mocked(useReanimatedFocusedInput).mockReturnValue({input: {value: {target: 1}}});

            const deviceModule = require('@constants/device');
            deviceModule.isAndroidEdgeToEdge = true;

            const ctx = makeContext();
            const handlers = renderAndCapture(ctx, 1);

            // e.target is 99 (different), but input.value.target is 1 (matches inputTag)
            handlers.onStart({height: 300, progress: 0, target: 99});

            expect(ctx.processEvent).toHaveBeenCalledWith(
                expect.objectContaining({type: StateMachineEventType.USER_FOCUS_INPUT}),
            );

            deviceModule.isAndroidEdgeToEdge = false;
            jest.mocked(useReanimatedFocusedInput).mockReturnValue({input: {value: null}});
        });

        it('should still dispatch KEYBOARD_EVENT_START when state=KEYBOARD_OPEN and height=0 but target does not match', () => {
            const ctx = makeContext({currentStateValue: InputContainerStateType.KEYBOARD_OPEN});
            const handlers = renderAndCapture(ctx, 1);

            handlers.onStart({height: 0, progress: 0, target: 99});

            expect(ctx.processEvent).toHaveBeenCalledWith(
                expect.objectContaining({type: StateMachineEventType.KEYBOARD_EVENT_START}),
            );
        });
    });

    describe('onInteractive', () => {
        it('should set isDraggingKeyboard=true and isReconcilerPaused=true', () => {
            const ctx = makeContext();
            const handlers = renderAndCapture(ctx);

            handlers.onInteractive({height: 200, progress: 0.5});

            expect(ctx.isDraggingKeyboard.value).toBe(true);
            expect(ctx.isReconcilerPaused.value).toBe(true);
        });

        it('should dispatch KEYBOARD_EVENT_MOVE with height and progress', () => {
            const ctx = makeContext();
            const handlers = renderAndCapture(ctx);

            handlers.onInteractive({height: 200, progress: 0.5});

            expect(ctx.processEvent).toHaveBeenCalledWith({
                type: StateMachineEventType.KEYBOARD_EVENT_MOVE,
                rawHeight: 200,
                progress: 0.5,
            });
        });
    });

    describe('onMove', () => {
        it('should dispatch KEYBOARD_EVENT_MOVE when progress < 1 (non-edge-to-edge)', () => {
            const ctx = makeContext();
            const handlers = renderAndCapture(ctx);

            handlers.onMove({height: 150, progress: 0.5});

            expect(ctx.processEvent).toHaveBeenCalledWith({
                type: StateMachineEventType.KEYBOARD_EVENT_MOVE,
                rawHeight: 150,
                progress: 0.5,
            });
        });

        it('should dispatch KEYBOARD_EVENT_END instead of MOVE when progress=1 on non-edge-to-edge', () => {
            const ctx = makeContext();
            const handlers = renderAndCapture(ctx);

            handlers.onMove({height: 300, progress: 1});

            expect(ctx.processEvent).toHaveBeenCalledWith({
                type: StateMachineEventType.KEYBOARD_EVENT_END,
                rawHeight: 300,
                progress: 1,
            });
        });

        it('should dispatch KEYBOARD_EVENT_MOVE even when progress=1 on edge-to-edge', () => {
            // isAndroidEdgeToEdge is a module-level constant frozen at import time.
            // We override the module's exported value directly for this test.
            const deviceModule = require('@constants/device');
            deviceModule.isAndroidEdgeToEdge = true;

            const ctx = makeContext();
            const handlers = renderAndCapture(ctx);

            handlers.onMove({height: 300, progress: 1});

            expect(ctx.processEvent).toHaveBeenCalledWith({
                type: StateMachineEventType.KEYBOARD_EVENT_MOVE,
                rawHeight: 300,
                progress: 1,
            });

            deviceModule.isAndroidEdgeToEdge = false;
        });
    });

    describe('onEnd', () => {
        it('should dispatch KEYBOARD_EVENT_END with isRotating=false when no rotation occurred', () => {
            const ctx = makeContext();
            const handlers = renderAndCapture(ctx, 1);

            handlers.onEnd({height: 300, progress: 1, target: 1});

            expect(ctx.processEvent).toHaveBeenCalledWith({
                type: StateMachineEventType.KEYBOARD_EVENT_END,
                rawHeight: 300,
                progress: 1,
                isRotating: false,
            });
        });

        it('should detect rotation and suppress KEYBOARD_EVENT_END on rotation start (height=0)', () => {
            const ctx = makeContext({currentStateValue: InputContainerStateType.KEYBOARD_OPEN});
            const handlers = renderAndCapture(ctx, 1);

            // Trigger rotation via onStart (height=0, progress=0, target matches KEYBOARD_OPEN)
            handlers.onStart({height: 0, progress: 0, target: 1});

            // onEnd with height=0 — rotation is in progress, should suppress the END event
            handlers.onEnd({height: 0, progress: 0, target: 1});

            expect(ctx.processEvent).not.toHaveBeenCalledWith(
                expect.objectContaining({type: StateMachineEventType.KEYBOARD_EVENT_END}),
            );
        });

        it('should dispatch KEYBOARD_EVENT_END with isRotating=true after the keyboard reopens post-rotation', () => {
            const ctx = makeContext({currentStateValue: InputContainerStateType.KEYBOARD_OPEN});
            const handlers = renderAndCapture(ctx, 1);

            // Phase 1: rotation start — keyboard closes (height=0)
            handlers.onStart({height: 0, progress: 0, target: 1});
            handlers.onEnd({height: 0, progress: 0, target: 1}); // sets wasRotating=true

            // Phase 2: keyboard reopens after rotation
            handlers.onEnd({height: 300, progress: 1, target: 1});

            expect(ctx.processEvent).toHaveBeenCalledWith({
                type: StateMachineEventType.KEYBOARD_EVENT_END,
                rawHeight: 300,
                progress: 1,
                isRotating: true,
            });
        });

        it('should clear wasRotating after the post-rotation END event is dispatched', () => {
            const ctx = makeContext({currentStateValue: InputContainerStateType.KEYBOARD_OPEN});
            const handlers = renderAndCapture(ctx, 1);

            // Full rotation cycle
            handlers.onStart({height: 0, progress: 0, target: 1});
            handlers.onEnd({height: 0, progress: 0, target: 1});
            handlers.onEnd({height: 300, progress: 1, target: 1});

            jest.mocked(ctx.processEvent).mockClear();

            // A subsequent END event should have isRotating=false (wasRotating was cleared)
            handlers.onEnd({height: 300, progress: 1, target: 1});

            expect(ctx.processEvent).toHaveBeenCalledWith(
                expect.objectContaining({isRotating: false}),
            );
        });

        it('should set isRotating=false on any onEnd call that is not a rotation start', () => {
            const ctx = makeContext();
            const handlers = renderAndCapture(ctx, 1);

            // Normal end — isRotating should be reset (was already false)
            handlers.onEnd({height: 300, progress: 1, target: 1});

            // Verify processEvent was called (isRotating.value was false → not suppressed)
            expect(ctx.processEvent).toHaveBeenCalledTimes(1);
        });

        it('should pass isRotating=false when target does not match inputTag even after rotation', () => {
            const ctx = makeContext({currentStateValue: InputContainerStateType.KEYBOARD_OPEN});
            const handlers = renderAndCapture(ctx, 1);

            // Trigger wasRotating via rotation cycle
            handlers.onStart({height: 0, progress: 0, target: 1});
            handlers.onEnd({height: 0, progress: 0, target: 1});

            jest.mocked(ctx.processEvent).mockClear();

            // Post-rotation END but target does NOT match inputTag
            handlers.onEnd({height: 300, progress: 1, target: 99});

            expect(ctx.processEvent).toHaveBeenCalledWith(
                expect.objectContaining({isRotating: false}),
            );
        });
    });
});
