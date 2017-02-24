// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';
import deepFreeze from 'deep-freeze';

import {NavigationTypes} from 'app/constants';
import Routes from 'app/navigation/routes';
import reduceNavigation from 'app/reducers/navigation';

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
            routes: [Routes.Root],
            modal: {
                index: 0,
                routes: []
            },
            isModal: false,
            leftDrawerOpen: false,
            leftDrawerRoute: null,
            rightDrawerOpen: false,
            rightDrawerRoute: null
        }, 'initial state');
    });

    it('NAVIGATION_PUSH', () => {
        let state = initialState();

        it('first push', () => {
            state = reduceAndFreeze(state, {
                type: NavigationTypes.NAVIGATION_PUSH,
                route: {key: 'fake'}
            });

            assert.equal(state.index, 1);
            assert.deepEqual(state.routes, [Routes.Root, {key: 'fake'}]);
        });

        it('second push', () => {
            state = reduceAndFreeze(state, {
                type: NavigationTypes.NAVIGATION_PUSH,
                route: {key: 'fake2'}
            });

            assert.equal(state.index, 2);
            assert.deepEqual(state.routes, [Routes.Root, {key: 'fake2'}]);
        });

        state = reduceAndFreeze(state, {
            type: NavigationTypes.NAVIGATION_JUMP,
            key: Routes.Root.key
        });

        it('push when not at head of stack', () => {
            state = reduceAndFreeze(state, {
                type: NavigationTypes.NAVIGATION_PUSH,
                route: {key: 'fake3'}
            });

            // The next route on the stack is replaced, but anything past that is left unchanged
            assert.equal(state.index, 1);
            assert.deepEqual(state.routes, [Routes.Root, {key: 'fake3'}, {key: 'fake2'}]);
        });
    });

    it('NAVIGATION_POP', () => {
        let state = initialState();

        state = reduceAndFreeze(state, {
            type: NavigationTypes.NAVIGATION_PUSH,
            route: {key: 'fake'}
        });
        state = reduceAndFreeze(state, {
            type: NavigationTypes.NAVIGATION_PUSH,
            route: {key: 'fake2'}
        });

        it('first pop', () => {
            state = reduceAndFreeze(state, {
                type: NavigationTypes.NAVIGATION_POP
            });

            assert.equal(state.index, 1);
            assert.deepEqual(state.routes, [Routes.Root, {key: 'fake'}]);
        });

        it('second pop', () => {
            state = reduceAndFreeze(state, {
                type: NavigationTypes.NAVIGATION_POP
            });

            assert.equal(state.index, 0);
            assert.deepEqual(state.routes, [Routes.Root]);
        });

        it('pop last entry on stack', () => {
            state = reduceAndFreeze(state, {
                type: NavigationTypes.NAVIGATION_POP
            });

            // Nothing happens
            assert.equal(state.index, 0);
            assert.deepEqual(state.routes, [Routes.Root]);
        });

        state = reduceAndFreeze(state, {
            type: NavigationTypes.NAVIGATION_PUSH,
            route: {key: 'fake3'}
        });
        state = reduceAndFreeze(state, {
            type: NavigationTypes.NAVIGATION_OPEN_LEFT_DRAWER,
            route: {key: 'fake'}
        });

        it('popping to close left drawer', () => {
            state.reduceAndFreeze(state, {
                type: NavigationTypes.NAVIGATION_POP
            });

            // Routes not popped, but drawer closed
            assert.equal(state.index, 1);
            assert.deepEqual(state.routes, [Routes.Root, {key: 'fake3'}]);
            assert.equal(state.leftDrawerOpen, false);
            assert.equal(state.rightDrawerOpen, false);
        });

        state = reduceAndFreeze(state, {
            type: NavigationTypes.NAVIGATION_OPEN_RIGHT_DRAWER,
            route: {key: 'fake'}
        });

        it('popping to close right drawer', () => {
            state.reduceAndFreeze(state, {
                type: NavigationTypes.NAVIGATION_POP
            });

            // Routes not popped, but drawer closed
            assert.equal(state.index, 1);
            assert.deepEqual(state.routes, [Routes.Root, {key: 'fake'}]);
            assert.equal(state.leftDrawerOpen, false);
            assert.equal(state.rightDrawerOpen, false);
        });
    });

    it('NAVIGATION_POP_TO_INDEX', () => {
        let state = initialState();

        state = reduceAndFreeze(state, {
            type: NavigationTypes.NAVIGATION_PUSH,
            route: {key: 'fake'}
        });
        state = reduceAndFreeze(state, {
            type: NavigationTypes.NAVIGATION_PUSH,
            route: {key: 'fake2'}
        });
        state = reduceAndFreeze(state, {
            type: NavigationTypes.NAVIGATION_PUSH,
            route: {key: 'fake3'}
        });

        it('Reset to first index', () => {
            state = reduceAndFreeze(state, {
                type: NavigationTypes.NAVIGATION_POP_TO_INDEX,
                index: 0
            });

            assert.equal(state.index, 0);
            assert.deepEqual(state.routes, [Routes.Root, {key: 'fake'}]);
        });
    });

    it('NAVIGATION_OPEN_LEFT_DRAWER', () => {
        let state = initialState();

        it('open left drawer', () => {
            state = reduceAndFreeze(state, {
                type: NavigationTypes.NAVIGATION_OPEN_LEFT_DRAWER,
                route: {key: 'fake'}
            });

            assert.equal(state.index, 0);
            assert.deepEqual(state.routes, [Routes.Root]);
            assert.equal(state.leftDrawerOpen, true);
            assert.deepEqual(state.leftDrawerRoute, {key: 'fake'});
            assert.equal(state.rightDrawerOpen, false);
        });
    });

    it('NAVIGATION_OPEN_RIGHT_DRAWER', () => {
        let state = initialState();

        it('open right drawer', () => {
            state = reduceAndFreeze(state, {
                type: NavigationTypes.NAVIGATION_OPEN_RIGHT_DRAWER,
                route: {key: 'fake'}
            });

            assert.equal(state.index, 0);
            assert.deepEqual(state.routes, [Routes.Root]);
            assert.equal(state.leftDrawerOpen, false);
            assert.equal(state.rightDrawerOpen, true);
            assert.deepEqual(state.rightDrawerRoute, {key: 'fake'});
        });
    });

    it('NAVIGATION_CLOSE_DRAWERS', () => {
        let state = initialState();

        state = reduceAndFreeze(state, {
            type: NavigationTypes.NAVIGATION_OPEN_LEFT_DRAWER,
            route: {key: 'fake'}
        });

        it('close left drawer', () => {
            state = reduceAndFreeze(state, {
                type: NavigationTypes.NAVIGATION_CLOSE_DRAWERS
            });

            assert.equal(state.index, 0);
            assert.deepEqual(state.routes, [Routes.Root]);
            assert.equal(state.leftDrawerOpen, false);
        });

        state = reduceAndFreeze(state, {
            type: NavigationTypes.NAVIGATION_OPEN_RIGHT_DRAWER,
            route: {key: 'fake'}
        });

        it('close right drawer', () => {
            state = reduceAndFreeze(state, {
                type: NavigationTypes.NAVIGATION_CLOSE_DRAWERS
            });

            assert.equal(state.index, 0);
            assert.deepEqual(state.routes, [Routes.Root]);
            assert.equal(state.rightDrawerOpen, false);
        });
    });

    it('NAVIGATION_JUMP', () => {
        let state = initialState();

        state = reduceAndFreeze(state, {
            type: NavigationTypes.NAVIGATION_PUSH,
            route: {key: 'fake'}
        });
        state = reduceAndFreeze(state, {
            type: NavigationTypes.NAVIGATION_PUSH,
            route: {key: 'fake2'}
        });

        it('jump back', () => {
            state = reduceAndFreeze(state, {
                type: NavigationTypes.NAVIGATION_JUMP,
                key: Routes.Root.key
            });

            // The rest of the stack is preserved
            assert.equal(state.index, 0);
            assert.deepEqual(state.routes, [Routes.Root, {key: 'fake'}, {key: 'fake2'}]);
        });

        it('jump forward', () => {
            state = reduceAndFreeze(state, {
                type: NavigationTypes.NAVIGATION_JUMP,
                key: 'fake'
            });

            assert.equal(state.index, 2);
            assert.deepEqual(state.routes, [Routes.Root, {key: 'fake'}, {key: 'fake2'}]);
        });
    });

    it('NAVIGATION_JUMP_TO_INDEX', () => {
        let state = initialState();

        state = reduceAndFreeze(state, {
            type: NavigationTypes.NAVIGATION_PUSH,
            route: {key: 'fake'}
        });
        state = reduceAndFreeze(state, {
            type: NavigationTypes.NAVIGATION_PUSH,
            route: {key: 'fake2'}
        });

        it('jump back', () => {
            state = reduceAndFreeze(state, {
                type: NavigationTypes.NAVIGATION_JUMP_TO_INDEX,
                index: 1
            });

            // The rest of the stack is preserved
            assert.equal(state.index, 0);
            assert.deepEqual(state.routes, [Routes.Root, {key: 'fake'}, {key: 'fake2'}]);
        });

        it('jump forward', () => {
            state = reduceAndFreeze(state, {
                type: NavigationTypes.NAVIGATION_JUMP_TO_INDEX,
                index: 2
            });

            assert.equal(state.index, 2);
            assert.deepEqual(state.routes, [Routes.Root, {key: 'fake'}, {key: 'fake2'}]);
        });
    });

    it('NAVIGATION_RESET', () => {
        let state = initialState();

        state = reduceAndFreeze(state, {
            type: NavigationTypes.NAVIGATION_PUSH,
            route: {key: 'fake'}
        });
        state = reduceAndFreeze(state, {
            type: NavigationTypes.NAVIGATION_PUSH,
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
                routes: [{key: 'fake3'}, {key: 'fake4'}],
                leftDrawerOpen: false,
                leftDrawerRoute: null,
                rightDrawerOpen: false,
                rightDrawerRoute: null
            });
        });

        state = initialState();
        state = reduceAndFreeze(state, {
            type: NavigationTypes.NAVIGATION_PUSH,
            route: {key: 'fake'}
        });
        state = reduceAndFreeze(state, {
            type: NavigationTypes.NAVIGATION_OPEN_LEFT_DRAWER,
            route: {key: 'fake2'}
        });

        it('reset with left drawer open', () => {
            state = reduceAndFreeze(state, {
                type: NavigationTypes.NAVIGATION_RESET,
                index: 1,
                routes: [{key: 'fake3'}, {key: 'fake4'}]
            });

            assert.deepEqual(state, {
                index: 1,
                routes: [{key: 'fake3'}, {key: 'fake4'}],
                leftDrawerOpen: false,
                leftDrawerRoute: {key: 'fake2'}, // Leave drawer routes in tact so that the close animation still works
                rightDrawerOpen: false,
                rightDrawerRoute: null
            });
        });

        state = initialState();
        state = reduceAndFreeze(state, {
            type: NavigationTypes.NAVIGATION_PUSH,
            route: {key: 'fake'}
        });
        state = reduceAndFreeze(state, {
            type: NavigationTypes.NAVIGATION_OPEN_RIGHT_DRAWER,
            route: {key: 'fake2'}
        });

        it('reset with left drawer open', () => {
            state = reduceAndFreeze(state, {
                type: NavigationTypes.NAVIGATION_RESET,
                index: 1,
                routes: [{key: 'fake3'}, {key: 'fake4'}]
            });

            assert.deepEqual(state, {
                index: 1,
                routes: [{key: 'fake3'}, {key: 'fake4'}],
                leftDrawerOpen: false,
                leftDrawerRoute: null,
                rightDrawerOpen: false,
                rightDrawerRoute: {key: 'fake2'} // Leave drawer routes in tact so that the close animation still works
            });
        });
    });
});
