// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {StateSnapshot, StateEvent} from '@keyboard/state_machine/types';

jest.mock('@constants/device', () => ({isEdgeToEdge: false}));

jest.mock('./idle', () => ({
    idleTransitions: [],
    idleTransitionsNonEdgeToEdge: [
        {from: 'IDLE', event: 'USER_OPEN_EMOJI', to: 'EMOJI_PICKER_OPEN'},
    ],
}));
jest.mock('./keyboard_opening', () => ({keyboardOpeningTransitions: []}));
jest.mock('./keyboard_open', () => ({keyboardOpenTransitions: []}));
jest.mock('./keyboard_to_emoji', () => ({keyboardToEmojiTransitions: []}));
jest.mock('./emoji_picker_open', () => ({
    emojiPickerOpenTransitions: [],
    emojiPickerOpenTransitionsNonEdgeToEdge: [
        {from: 'EMOJI_PICKER_OPEN', event: 'USER_CLOSE_EMOJI', to: 'IDLE'},
    ],
}));
jest.mock('./emoji_search_active', () => ({
    emojiSearchActiveTransitions: [],
    emojiSearchActiveTransitionsNonEdgeToEdge: [
        {from: 'EMOJI_SEARCH_ACTIVE', event: 'USER_CLOSE_EMOJI', to: 'IDLE'},
    ],
}));
jest.mock('./emoji_to_keyboard', () => ({emojiToKeyboardTransitions: []}));

describe('keyboard state machine transitions', () => {
    let getTransitionsFromState: (fromState: string) => unknown[];
    let findTransition: (fromState: string, eventType: string, snapshot: StateSnapshot, event: StateEvent) => unknown;

    beforeAll(() => {
        const mod = require('./index');
        getTransitionsFromState = mod.getTransitionsFromState;
        findTransition = mod.findTransition;
    });

    describe('getTransitionsFromState', () => {
        it('should return only transitions matching the given fromState', () => {
            const result = getTransitionsFromState('IDLE');
            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({from: 'IDLE', event: 'USER_OPEN_EMOJI', to: 'EMOJI_PICKER_OPEN'});
        });

        it('should return multiple transitions when several share the same fromState', () => {
            const result = getTransitionsFromState('EMOJI_PICKER_OPEN');
            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({from: 'EMOJI_PICKER_OPEN'});
        });

        it('should return empty array for an unknown state', () => {
            const result = getTransitionsFromState('UNKNOWN_STATE');
            expect(result).toHaveLength(0);
        });
    });

    describe('findTransition', () => {
        const snapshot = {} as never;
        const event = {} as never;

        it('should return a matching transition when no guard is defined', () => {
            const result = findTransition('IDLE', 'USER_OPEN_EMOJI', snapshot, event);
            expect(result).toBeDefined();
            expect(result).toMatchObject({from: 'IDLE', event: 'USER_OPEN_EMOJI', to: 'EMOJI_PICKER_OPEN'});
        });

        it('should return undefined when no transition matches fromState and eventType', () => {
            const result = findTransition('IDLE', 'KEYBOARD_EVENT_START', snapshot, event);
            expect(result).toBeUndefined();
        });

        it('should skip transitions whose guard returns false and return the next candidate', () => {
            jest.resetModules();
            jest.doMock('@constants/device', () => ({isEdgeToEdge: false}));
            jest.doMock('./idle', () => ({
                idleTransitions: [],
                idleTransitionsNonEdgeToEdge: [
                    {
                        from: 'IDLE',
                        event: 'USER_OPEN_EMOJI',
                        to: 'BLOCKED',
                        guard: () => false,
                    },
                    {
                        from: 'IDLE',
                        event: 'USER_OPEN_EMOJI',
                        to: 'EMOJI_PICKER_OPEN',
                        guard: () => true,
                    },
                ],
            }));
            jest.doMock('./keyboard_opening', () => ({keyboardOpeningTransitions: []}));
            jest.doMock('./keyboard_open', () => ({keyboardOpenTransitions: []}));
            jest.doMock('./keyboard_to_emoji', () => ({keyboardToEmojiTransitions: []}));
            jest.doMock('./emoji_picker_open', () => ({
                emojiPickerOpenTransitions: [],
                emojiPickerOpenTransitionsNonEdgeToEdge: [],
            }));
            jest.doMock('./emoji_search_active', () => ({
                emojiSearchActiveTransitions: [],
                emojiSearchActiveTransitionsNonEdgeToEdge: [],
            }));
            jest.doMock('./emoji_to_keyboard', () => ({emojiToKeyboardTransitions: []}));

            const {findTransition: ft} = require('./index');
            const result = ft('IDLE', 'USER_OPEN_EMOJI', {} as never, {} as never);
            expect(result).toBeDefined();
            expect((result as {to: string}).to).toBe('EMOJI_PICKER_OPEN');
            jest.resetModules();
        });

        it('should return undefined when all guards fail', () => {
            jest.resetModules();
            jest.doMock('@constants/device', () => ({isEdgeToEdge: false}));
            jest.doMock('./idle', () => ({
                idleTransitions: [],
                idleTransitionsNonEdgeToEdge: [
                    {from: 'IDLE', event: 'USER_OPEN_EMOJI', to: 'EMOJI_PICKER_OPEN', guard: () => false},
                ],
            }));
            jest.doMock('./keyboard_opening', () => ({keyboardOpeningTransitions: []}));
            jest.doMock('./keyboard_open', () => ({keyboardOpenTransitions: []}));
            jest.doMock('./keyboard_to_emoji', () => ({keyboardToEmojiTransitions: []}));
            jest.doMock('./emoji_picker_open', () => ({
                emojiPickerOpenTransitions: [],
                emojiPickerOpenTransitionsNonEdgeToEdge: [],
            }));
            jest.doMock('./emoji_search_active', () => ({
                emojiSearchActiveTransitions: [],
                emojiSearchActiveTransitionsNonEdgeToEdge: [],
            }));
            jest.doMock('./emoji_to_keyboard', () => ({emojiToKeyboardTransitions: []}));

            const {findTransition: ft} = require('./index');
            const result = ft('IDLE', 'USER_OPEN_EMOJI', {} as never, {} as never);
            expect(result).toBeUndefined();
            jest.resetModules();
        });

        it('should use edge-to-edge transitions when isEdgeToEdge=true', () => {
            jest.resetModules();
            jest.doMock('@constants/device', () => ({isEdgeToEdge: true}));
            jest.doMock('./idle', () => ({
                idleTransitions: [{from: 'IDLE', event: 'USER_FOCUS_INPUT', to: 'KEYBOARD_OPENING'}],
                idleTransitionsNonEdgeToEdge: [],
            }));
            jest.doMock('./keyboard_opening', () => ({keyboardOpeningTransitions: []}));
            jest.doMock('./keyboard_open', () => ({keyboardOpenTransitions: []}));
            jest.doMock('./keyboard_to_emoji', () => ({keyboardToEmojiTransitions: []}));
            jest.doMock('./emoji_picker_open', () => ({
                emojiPickerOpenTransitions: [],
                emojiPickerOpenTransitionsNonEdgeToEdge: [],
            }));
            jest.doMock('./emoji_search_active', () => ({
                emojiSearchActiveTransitions: [],
                emojiSearchActiveTransitionsNonEdgeToEdge: [],
            }));
            jest.doMock('./emoji_to_keyboard', () => ({emojiToKeyboardTransitions: []}));

            const {findTransition: ft} = require('./index');
            const result = ft('IDLE', 'USER_FOCUS_INPUT', {} as never, {} as never);
            expect(result).toBeDefined();
            expect((result as {to: string}).to).toBe('KEYBOARD_OPENING');
            jest.resetModules();
        });
    });
});
