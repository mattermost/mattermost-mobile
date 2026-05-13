// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Public API for the new keyboard architecture
 *
 * This is a clean slate architecture for keyboard/emoji picker interactions.
 * Currently dormant (Phase 1) - will be integrated in Phase 2.
 *
 * Feature flag: NEW_KEYBOARD_ARCHITECTURE
 */

export {InputContainerStateType, StateMachineEventType, type ActionUpdates, type InputContainerState, type StateMachineEvent, type SharedValueUpdate, type StateContext, type StateEvent, type StateSnapshot, type StateTransition, type StateAction} from './state_machine/types';

// Constants
export {
    SEARCH_BAR_HEIGHT,
    SEARCH_CONTAINER_PADDING,
    MINIMAL_EMOJI_LIST_HEIGHT,
    KEYBOARD_TRANSITION_DURATION,
    DEFAULT_INPUT_ACCESSORY_HEIGHT,
} from './constants';

