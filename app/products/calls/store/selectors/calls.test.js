// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'assert';

import deepFreezeAndThrowOnMutation from '@mm-redux/utils/deep_freeze';

import * as Selectors from './calls';

describe('Selectors.Calls', () => {
    const call1 = {id: 'call1'};
    const call2 = {id: 'call2'};
    const testState = deepFreezeAndThrowOnMutation({
        entities: {
            channels: {
                currentChannelId: 'channel-1',
            },
            calls: {
                calls: {call1, call2},
                joined: 'call1',
                enabled: {'channel-1': true, 'channel-2': false},
                screenShareURL: 'screenshare-url',
            },
        },
    });

    it('getCalls', () => {
        assert.deepEqual(Selectors.getCalls(testState), {call1, call2});
    });

    it('getCurrentCall', () => {
        assert.deepEqual(Selectors.getCurrentCall(testState), call1);
        let newState = {
            ...testState,
            entities: {
                ...testState.entities,
                calls: {
                    ...testState.entities.calls,
                    joined: null,
                },
            },
        };
        assert.equal(Selectors.getCurrentCall(newState), null);
        newState = {
            ...testState,
            entities: {
                ...testState.entities,
                calls: {
                    ...testState.entities.calls,
                    joined: 'invalid-id',
                },
            },
        };
        assert.equal(Selectors.getCurrentCall(newState), null);
    });

    it('isCallsEnabled', () => {
        assert.equal(Selectors.isCallsEnabled(testState), true);
        let newState = {
            ...testState,
            entities: {
                ...testState.entities,
                channels: {currentChannelId: 'channel-2'},
            },
        };
        assert.equal(Selectors.isCallsEnabled(newState), false);
        newState = {
            ...testState,
            entities: {
                ...testState.entities,
                channels: {currentChannelId: 'not-valid-channel'},
            },
        };
        assert.equal(Selectors.isCallsEnabled(newState), false);
    });

    it('getScreenShareURL', () => {
        assert.equal(Selectors.getScreenShareURL(testState), 'screenshare-url');
    });
});
