// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isEdgeToEdge} from '@constants/device';

import {emojiPickerOpenTransitions, emojiPickerOpenTransitionsNonEdgeToEdge} from './emoji_picker_open';
import {emojiSearchActiveTransitions, emojiSearchActiveTransitionsNonEdgeToEdge} from './emoji_search_active';
import {emojiToKeyboardTransitions} from './emoji_to_keyboard';
import {idleTransitions, idleTransitionsNonEdgeToEdge} from './idle';
import {keyboardOpenTransitions} from './keyboard_open';
import {keyboardOpeningTransitions} from './keyboard_opening';
import {keyboardToEmojiTransitions} from './keyboard_to_emoji';

import type {StateTransition, StateSnapshot, StateEvent} from '@keyboard/state_machine/types';

/**
 * State transition table based on the plan's state transition rules (section 1)
 *
 * Each transition defines:
 * - from: The current state
 * - event: The event that triggers the transition
 * - to: The next state
 * - guard: Optional condition that must be true for the transition
 * - action: Optional action to execute during the transition
 *
 * On non-edge-to-edge Android (API < 30), the OS handles keyboard avoidance via adjustResize
 * and no KEYBOARD_EVENT_* fire. Only emoji picker transitions are needed.
 */
export const stateTransitions: StateTransition[] = isEdgeToEdge ? [
    ...idleTransitions,
    ...keyboardOpeningTransitions,
    ...keyboardOpenTransitions,
    ...keyboardToEmojiTransitions,
    ...emojiPickerOpenTransitions,
    ...emojiSearchActiveTransitions,
    ...emojiToKeyboardTransitions,
] : [
    ...idleTransitionsNonEdgeToEdge,
    ...emojiPickerOpenTransitionsNonEdgeToEdge,
    ...emojiSearchActiveTransitionsNonEdgeToEdge,
];

/**
 * Find all valid transitions from a given state
 * @param fromState - The current state
 * @returns Array of transitions available from this state
 */
export function getTransitionsFromState(fromState: string): StateTransition[] {
    return stateTransitions.filter((t) => t.from === fromState);
}

/**
 * Find a specific transition matching state and event
 * @param fromState - The current state
 * @param eventType - The event type
 * @param snapshot - The state snapshot (for guard evaluation)
 * @param event - The event payload (for guard evaluation)
 * @returns The matching transition, or undefined if none found
 */
export function findTransition(
    fromState: string,
    eventType: string,
    snapshot: StateSnapshot,
    event: StateEvent,
): StateTransition | undefined {
    'worklet';
    const candidates = stateTransitions.filter(
        (t) => t.from === fromState && t.event === eventType,
    );

    // If multiple transitions exist for same from+event, use guards to disambiguate
    for (const transition of candidates) {
        if (!transition.guard || transition.guard(snapshot, event)) {
            return transition;
        }
    }

    return undefined;
}
