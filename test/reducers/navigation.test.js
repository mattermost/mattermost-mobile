// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';
import deepFreeze from 'deep-freeze';

import {NavigationTypes} from 'constants';
import Routes from 'navigation/routes';
import reduceNavigation from 'reducers/navigation';

function reduceAndFreeze(state, actions) {
    return deepFreeze(reduceNavigation(state, actions));
}

function initialState() {
    return reduceAndFreeze(undefined, {});
}

describe('Reducers.Navigation', () => {
    it('initial state', () => {
        const state = initialState();

        assert.deepEqual(state, {
            index: 0,
            routes: [Routes.Root]
        }, 'initial state');
    });

    it('NAVIGATION_PUSH', () => {
        let state = initialState();

        it('first push', () => {
            state = reduceAndFreeze(state, {
                type: NavigationTypes.PUSH,
                route: {key: 'fake'}
            });

            assert.deepEqual(state, {
                index: 1,
                routes: [Routes.Root, {key: 'fake'}]
            });
        });

        it('second push', () => {
            state = reduceAndFreeze(state, {
                type: NavigationTypes.PUSH,
                route: {key: 'fake2'}
            });

            assert.deepEqual(state, {
                index: 1,
                routes: [Routes.Root, {key: 'fake'}, {key: 'fake2'}]
            });
        });

        it('push when not at head of stack', () => {
            state = reduceAndFreeze(state, {
                type: NavigationTypes.JUMP,
                key: Routes.key.root
            });

            state = reduceAndFreeze(state, {
                type: NavigationTypes.PUSH,
                route: {key: 'fake3'}
            });

            // The next route on the stack is replaced, but anything past that is left unchanged
            assert.deepEqual(state, {
                index: 1,
                routes: [Routes.Root, {key: 'fake3'}, {key: 'fake2'}]
            });
        });
    });

    it('NAVIGATION_POP', () => {
        let state = initialState();

        state = reduceAndFreeze(state, {
            type: NavigationTypes.PUSH,
            route: {key: 'fake'}
        });
        state = reduceAndFreeze(state, {
            type: NavigationTypes.PUSH,
            route: {key: 'fake2'}
        });

        it('first pop', () => {
            state = reduceAndFreeze(state, {
                type: NavigationTypes.POP
            });

            assert.deepEqual(state, {
                index: 1,
                routes: [Routes.Root, {key: 'fake'}]
            });
        });

        it('second pop', () => {
            state = reduceAndFreeze(state, {
                type: NavigationTypes.POP
            });

            assert.deepEqual(state, {
                index: 0,
                routes: [Routes.Root]
            });
        });

        it('pop last entry on stack', () => {
            state = reduceAndFreeze(state, {
                type: NavigationTypes.POP
            });

            assert.deepEqual(state, {
                index: 0,
                routes: [Routes.Root]
            });
        });
    });

    it('NAVIGATION_JUMP', () => {
        let state = initialState();

        state = reduceAndFreeze(state, {
            type: NavigationTypes.PUSH,
            route: {key: 'fake'}
        });
        state = reduceAndFreeze(state, {
            type: NavigationTypes.PUSH,
            route: {key: 'fake2'}
        });

        it('jump back', () => {
            state = reduceAndFreeze(state, {
                type: NavigationTypes.NAVIGATION_JUMP,
                key: Routes.Root.key
            });

            // The rest of the stack is preserved
            assert.deepEqual(state, {
                index: 0,
                routes: [Routes.Root, {key: 'fake'}, {key: 'fake2'}]
            });
        });

        it('jump forward', () => {
            state = reduceAndFreeze(state, {
                type: NavigationTypes.NAVIGATION_JUMP,
                key: 'fake'
            });

            assert.deepEqual(state, {
                index: 2,
                routes: [Routes.Root, {key: 'fake'}, {key: 'fake2'}]
            });
        });
    });

    it('NAVIGATION_JUMP_TO_INDEX', () => {
        let state = initialState();

        state = reduceAndFreeze(state, {
            type: NavigationTypes.PUSH,
            route: {key: 'fake'}
        });
        state = reduceAndFreeze(state, {
            type: NavigationTypes.PUSH,
            route: {key: 'fake2'}
        });

        it('jump back', () => {
            state = reduceAndFreeze(state, {
                type: NavigationTypes.NAVIGATION_JUMP_TO_INDEX,
                index: 1
            });

            // The rest of the stack is preserved
            assert.deepEqual(state, {
                index: 0,
                routes: [Routes.Root, {key: 'fake'}, {key: 'fake2'}]
            });
        });

        it('jump forward', () => {
            state = reduceAndFreeze(state, {
                type: NavigationTypes.NAVIGATION_JUMP_TO_INDEX,
                index: 2
            });

            assert.deepEqual(state, {
                index: 2,
                routes: [Routes.Root, {key: 'fake'}, {key: 'fake2'}]
            });
        });
    });

    it('NAVIGATION_RESET', () => {
        let state = initialState();

        state = reduceAndFreeze(state, {
            type: NavigationTypes.PUSH,
            route: {key: 'fake'}
        });
        state = reduceAndFreeze(state, {
            type: NavigationTypes.PUSH,
            route: {key: 'fake2'}
        });

        it('reset', () => {
            state = reduceAndFreeze(state, {
                type: NavigationTypes.NAVIGATION_RESET,
                index: 1,
                routes: [{key: 'fake3'}, {key: 'fake4'}]
            });

            // The navigation state is wiped out and replaced with the new state
            assert.deepEqual(state, {
                index: 1,
                routes: [{key: 'fake3'}, {key: 'fake4'}]
            });
        });
    });
});
