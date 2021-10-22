// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'assert';

import CallsTypes from '@mmproducts/calls/store/action_types/calls';

import callsReducer from './calls';

describe('Reducers.calls.calls', () => {
    const call1 = {
        participants: {
            'user-1': {id: 'user-1', muted: false, isTalking: false},
            'user-2': {id: 'user-2', muted: true, isTalking: true},
        },
        channelId: 'channel-1',
        startTime: 123,
        speakers: ['user-2'],
        screenOn: '',
        threadId: 'thread-1',
    };
    const call2 = {
        participants: {
            'user-3': {id: 'user-3', muted: false, isTalking: false},
            'user-4': {id: 'user-4', muted: true, isTalking: true},
        },
        channelId: 'channel-2',
        startTime: 123,
        speakers: ['user-4'],
        screenOn: '',
        threadId: 'thread-2',
    };
    const call3 = {
        participants: {
            'user-5': {id: 'user-5', muted: false, isTalking: false},
            'user-6': {id: 'user-6', muted: true, isTalking: true},
        },
        channelId: 'channel-3',
        startTime: 123,
        speakers: ['user-6'],
        screenOn: '',
        threadId: 'thread-3',
    };
    it('initial state', async () => {
        let state = {};

        state = callsReducer(state, {});
        assert.deepEqual(state.calls, {}, 'initial state');
    });

    it('RECEIVED_CALLS', async () => {
        let state = {calls: {calls: {'channel-1': call1}}, enabled: {'channel-1': true}, joined: 'channel-1'};
        const testAction = {
            type: CallsTypes.RECEIVED_CALLS,
            data: {calls: {'channel-1': call2, 'channel-2': call3}, enabled: {'channel-1': true}},
        };

        state = callsReducer(state, testAction);
        assert.deepEqual(state.calls, {'channel-1': call2, 'channel-2': call3});
    });

    it('RECEIVED_LEFT_CALL', async () => {
        const initialState = {calls: {'channel-1': call1}};
        const testAction = {
            type: CallsTypes.RECEIVED_LEFT_CALL,
            data: {channelId: 'channel-1', userId: 'user-1'},
        };
        let state = callsReducer(initialState, testAction);
        assert.deepEqual(
            state.calls,
            {
                'channel-1': {
                    participants: {
                        'user-2': {id: 'user-2', muted: true, isTalking: true},
                    },
                    channelId: 'channel-1',
                    startTime: 123,
                    speakers: ['user-2'],
                    screenOn: false,
                    threadId: 'thread-1',
                },
            },
        );

        testAction.data = {channelId: 'channel-1', userId: 'not-valid-user'};

        state = callsReducer(initialState, testAction);
        assert.deepEqual(state.calls, {'channel-1': call1});

        testAction.data = {channelId: 'invalid-channel', userId: 'user-1'};

        state = callsReducer(initialState, testAction);
        assert.deepEqual(state.calls, {'channel-1': call1});
    });

    it('RECEIVED_JOINED_CALL', async () => {
        const initialState = {calls: {'channel-1': call1}};
        const testAction = {
            type: CallsTypes.RECEIVED_JOINED_CALL,
            data: {channelId: 'channel-1', userId: 'user-3'},
        };
        let state = callsReducer(initialState, testAction);
        assert.deepEqual(
            state.calls,
            {
                'channel-1': {
                    participants: {
                        'user-1': {id: 'user-1', muted: false, isTalking: false},
                        'user-2': {id: 'user-2', muted: true, isTalking: true},
                        'user-3': {id: 'user-3', muted: true, isTalking: false},
                    },
                    channelId: 'channel-1',
                    startTime: 123,
                    speakers: ['user-2'],
                    screenOn: false,
                    threadId: 'thread-1',
                },
            },
        );

        testAction.data = {channelId: 'invalid-channel', userId: 'user-1'};

        state = callsReducer(initialState, testAction);
        assert.deepEqual(state.calls, {'channel-1': call1});
    });

    it('RECEIVED_CALL_STARTED', async () => {
        const initialState = {calls: {}};
        const testAction = {
            type: CallsTypes.RECEIVED_CALL_STARTED,
            data: call1,
        };
        const state = callsReducer(initialState, testAction);
        assert.deepEqual(state.calls, {'channel-1': call1});
    });

    it('RECEIVED_CALL_FINISHED', async () => {
        const initialState = {calls: {'channel-1': call1, 'channel-2': call2}};
        const testAction = {
            type: CallsTypes.RECEIVED_CALL_FINISHED,
            data: call1,
        };
        const state = callsReducer(initialState, testAction);
        assert.deepEqual(state.calls, {'channel-2': call2});
    });

    it('RECEIVED_MUTE_USER_CALL', async () => {
        const initialState = {calls: {'channel-1': call1, 'channel-2': call2}};
        const testAction = {
            type: CallsTypes.RECEIVED_MUTE_USER_CALL,
            data: {channelId: 'channel-1', userId: 'user-1'},
        };
        let state = callsReducer(initialState, testAction);
        assert.equal(state.calls['channel-1'].participants['user-1'].muted, true);

        testAction.data = {channelId: 'channel-1', userId: 'invalidUser'};
        state = callsReducer(initialState, testAction);
        assert.deepEqual(state.calls, initialState.calls);

        testAction.data = {channelId: 'invalid-channel', userId: 'user-1'};
        state = callsReducer(initialState, testAction);
        assert.deepEqual(state.calls, initialState.calls);
    });

    it('RECEIVED_UNMUTE_USER_CALL', async () => {
        const initialState = {calls: {'channel-1': call1, 'channel-2': call2}};
        const testAction = {
            type: CallsTypes.RECEIVED_UNMUTE_USER_CALL,
            data: {channelId: 'channel-1', userId: 'user-2'},
        };
        let state = callsReducer(initialState, testAction);
        assert.equal(state.calls['channel-1'].participants['user-2'].muted, false);

        testAction.data = {channelId: 'channel-1', userId: 'invalidUser'};
        state = callsReducer(initialState, testAction);
        assert.deepEqual(state.calls, initialState.calls);

        testAction.data = {channelId: 'invalid-channel', userId: 'user-2'};
        state = callsReducer(initialState, testAction);
        assert.deepEqual(state.calls, initialState.calls);
    });

    it('RECEIVED_VOICE_ON_USER_CALL', async () => {
        const initialState = {calls: {'channel-1': call1, 'channel-2': call2}};
        const testAction = {
            type: CallsTypes.RECEIVED_VOICE_ON_USER_CALL,
            data: {channelId: 'channel-1', userId: 'user-1'},
        };
        let state = callsReducer(initialState, testAction);
        assert.equal(state.calls['channel-1'].participants['user-1'].isTalking, true);
        assert.deepEqual(state.calls['channel-1'].speakers, ['user-1', 'user-2']);

        testAction.data = {channelId: 'channel-1', userId: 'invalidUser'};
        state = callsReducer(initialState, testAction);
        assert.deepEqual(state.calls, initialState.calls);

        testAction.data = {channelId: 'invalid-channel', userId: 'user-2'};
        state = callsReducer(initialState, testAction);
        assert.deepEqual(state.calls, initialState.calls);
    });

    it('RECEIVED_VOICE_OFF_USER_CALL', async () => {
        const initialState = {calls: {'channel-1': call1, 'channel-2': call2}};
        const testAction = {
            type: CallsTypes.RECEIVED_VOICE_OFF_USER_CALL,
            data: {channelId: 'channel-1', userId: 'user-2'},
        };
        let state = callsReducer(initialState, testAction);
        assert.equal(state.calls['channel-1'].participants['user-2'].isTalking, false);
        assert.deepEqual(state.calls['channel-1'].speakers, []);

        testAction.data = {channelId: 'channel-1', userId: 'invalidUser'};
        state = callsReducer(initialState, testAction);
        assert.deepEqual(state.calls, initialState.calls);

        testAction.data = {channelId: 'invalid-channel', userId: 'user-2'};
        state = callsReducer(initialState, testAction);
        assert.deepEqual(state.calls, initialState.calls);
    });
    it('RECEIVED_CHANNEL_CALL_SCREEN_ON', async () => {
        const initialState = {calls: {'channel-1': call1, 'channel-2': call2}};
        const testAction = {
            type: CallsTypes.RECEIVED_CHANNEL_CALL_SCREEN_ON,
            data: {channelId: 'channel-1', userId: 'user-1'},
        };
        let state = callsReducer(initialState, testAction);
        assert.equal(state.calls['channel-1'].screenOn, 'user-1');

        testAction.data = {channelId: 'channel-1', userId: 'invalidUser'};
        state = callsReducer(initialState, testAction);
        assert.deepEqual(state.calls, initialState.calls);

        testAction.data = {channelId: 'invalid-channel', userId: 'user-1'};
        state = callsReducer(initialState, testAction);
        assert.deepEqual(state.calls, initialState.calls);
    });
    it('RECEIVED_CHANNEL_CALL_SCREEN_OFF', async () => {
        const initialState = {calls: {'channel-1': call1, 'channel-2': call2}};
        const testAction = {
            type: CallsTypes.RECEIVED_CHANNEL_CALL_SCREEN_OFF,
            data: {channelId: 'channel-1'},
        };
        let state = callsReducer(initialState, testAction);
        assert.equal(state.calls['channel-1'].screenOn, '');

        testAction.data = {channelId: 'invalid-channel'};
        state = callsReducer(initialState, testAction);
        assert.deepEqual(state.calls, initialState.calls);
    });
});

describe('Reducers.calls.joined', () => {
    it('RECEIVED_CALLS', async () => {
        const initialState = {joined: 'test'};
        const testAction = {
            type: CallsTypes.RECEIVED_CALLS,
            data: {calls: {'channel-1': {}, 'channel-2': {}}, enabled: {'channel-1': true}},
        };
        const state = callsReducer(initialState, testAction);
        assert.equal(state.joined, '');
    });

    it('RECEIVED_MYSELF_JOINED_CALL', async () => {
        const initialState = {joined: ''};
        const testAction = {
            type: CallsTypes.RECEIVED_MYSELF_JOINED_CALL,
            data: 'channel-id',
        };
        const state = callsReducer(initialState, testAction);
        assert.equal(state.joined, 'channel-id');
    });

    it('RECEIVED_MYSELF_LEFT_CALL', async () => {
        const initialState = {joined: 'test'};
        const testAction = {
            type: CallsTypes.RECEIVED_MYSELF_LEFT_CALL,
            data: null,
        };
        const state = callsReducer(initialState, testAction);
        assert.equal(state.joined, '');
    });
});

describe('Reducers.calls.enabled', () => {
    it('RECEIVED_CALLS', async () => {
        const initialState = {enabled: {}};
        const testAction = {
            type: CallsTypes.RECEIVED_CALLS,
            data: {calls: {'channel-1': {}, 'channel-2': {}}, enabled: {'channel-1': true}},
        };
        const state = callsReducer(initialState, testAction);
        assert.deepEqual(state.enabled, {'channel-1': true});
    });

    it('RECEIVED_CHANNEL_CALL_ENABLED', async () => {
        const initialState = {enabled: {'channel-1': true, 'channel-2': false}};
        const testAction = {
            type: CallsTypes.RECEIVED_CHANNEL_CALL_ENABLED,
            data: 'channel-3',
        };
        let state = callsReducer(initialState, testAction);
        assert.deepEqual(state.enabled, {'channel-1': true, 'channel-2': false, 'channel-3': true});

        testAction.data = 'channel-2';
        state = callsReducer(initialState, testAction);
        assert.deepEqual(state.enabled, {'channel-1': true, 'channel-2': true});

        testAction.data = 'channel-1';
        state = callsReducer(initialState, testAction);
        assert.deepEqual(state.enabled, {'channel-1': true, 'channel-2': false});
    });

    it('RECEIVED_CHANNEL_CALL_DISABLED', async () => {
        const initialState = {enabled: {'channel-1': true, 'channel-2': false}};
        const testAction = {
            type: CallsTypes.RECEIVED_CHANNEL_CALL_DISABLED,
            data: 'channel-3',
        };
        let state = callsReducer(initialState, testAction);
        assert.deepEqual(state.enabled, {'channel-1': true, 'channel-2': false, 'channel-3': false});

        testAction.data = 'channel-2';
        state = callsReducer(initialState, testAction);
        assert.deepEqual(state.enabled, {'channel-1': true, 'channel-2': false});

        testAction.data = 'channel-1';
        state = callsReducer(initialState, testAction);
        assert.deepEqual(state.enabled, {'channel-1': false, 'channel-2': false});
    });
});

describe('Reducers.calls.screenShareURL', () => {
    it('RECEIVED_MYSELF_JOINED_CALL', async () => {
        const initialState = {screenShareURL: 'test'};
        const testAction = {
            type: CallsTypes.RECEIVED_MYSELF_JOINED_CALL,
            data: 'channel-id',
        };
        const state = callsReducer(initialState, testAction);
        assert.deepEqual(state.screenShareURL, '');
    });

    it('RECEIVED_MYSELF_LEFT_CALL', async () => {
        const initialState = {screenShareURL: 'test'};
        const testAction = {
            type: CallsTypes.RECEIVED_MYSELF_LEFT_CALL,
            data: 'channel-id',
        };
        const state = callsReducer(initialState, testAction);
        assert.deepEqual(state.screenShareURL, '');
    });

    it('SET_SCREENSHARE_URL', async () => {
        const initialState = {screenShareURL: 'test'};
        const testAction = {
            type: CallsTypes.SET_SCREENSHARE_URL,
            data: 'new-url',
        };
        const state = callsReducer(initialState, testAction);
        assert.deepEqual(state.screenShareURL, 'new-url');
    });
});
