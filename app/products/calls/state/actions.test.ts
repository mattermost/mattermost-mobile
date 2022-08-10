// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'assert';

import {act, renderHook} from '@testing-library/react-hooks';

import {
    setCallsState,
    setChannelsWithCalls,
    setCurrentCall,
    useCallsConfig,
    useCallsState,
    useChannelsWithCalls,
    useCurrentCall,
} from '@calls/state';
import {
    setCalls,
    userJoinedCall,
    userLeftCall,
    callStarted,
    callEnded,
    setUserMuted,
    setCallScreenOn,
    setCallScreenOff,
    setRaisedHand,
    myselfJoinedCall,
    myselfLeftCall,
    setChannelEnabled,
    setScreenShareURL,
    setSpeakerPhone,
    setConfig,
    setPluginEnabled,
} from '@calls/state/actions';

import {CallsState, CurrentCall, DefaultCallsConfig, DefaultCallsState} from '../types/calls';

const call1 = {
    participants: {
        'user-1': {id: 'user-1', muted: false, raisedHand: 0},
        'user-2': {id: 'user-2', muted: true, raisedHand: 0},
    },
    channelId: 'channel-1',
    startTime: 123,
    screenOn: '',
    threadId: 'thread-1',
    ownerId: 'user-1',
};
const call2 = {
    participants: {
        'user-3': {id: 'user-3', muted: false, raisedHand: 0},
        'user-4': {id: 'user-4', muted: true, raisedHand: 0},
    },
    channelId: 'channel-2',
    startTime: 123,
    screenOn: '',
    threadId: 'thread-2',
    ownerId: 'user-3',
};
const call3 = {
    participants: {
        'user-5': {id: 'user-5', muted: false, raisedHand: 0},
        'user-6': {id: 'user-6', muted: true, raisedHand: 0},
    },
    channelId: 'channel-3',
    startTime: 123,
    screenOn: '',
    threadId: 'thread-3',
    ownerId: 'user-5',
};

describe('useCallsState', () => {
    beforeAll(() => {
        // create subjects
        const {result} = renderHook(() => {
            return [useCallsState('server1'), useChannelsWithCalls('server1'), useCurrentCall()];
        });

        assert.deepEqual(result.current[0], DefaultCallsState);
        assert.deepEqual(result.current[1], {});
        assert.deepEqual(result.current[2], null);
    });

    beforeEach(() => {
        // reset to default state for each test
        act(() => {
            setCallsState('server1', DefaultCallsState);
            setChannelsWithCalls('server1', {});
            setCurrentCall(null);
        });
    });

    it('default state', () => {
        const {result} = renderHook(() => {
            return [useCallsState('server1'), useChannelsWithCalls('server1')];
        });
        assert.deepEqual(result.current[0], DefaultCallsState);
        assert.deepEqual(result.current[1], {});
    });

    it('setCalls, two callsState hooks, channelsWithCalls hook, ', () => {
        const initialCallsState = {
            ...DefaultCallsState,
            calls: {'channel-1': call1},
            enabled: {'channel-1': true},
        };
        const initialChannelsWithCallsState = {
            'channel-1': true,
        };
        const test = {
            calls: {'channel-1': call2, 'channel-2': call3},
            enabled: {'channel-2': true},
        };
        const expectedCallsState = {
            ...initialCallsState,
            serverUrl: 'server1',
            myUserId: 'myId',
            calls: {'channel-1': call2, 'channel-2': call3},
            enabled: {'channel-2': true},
        };
        const expectedChannelsWithCallsState = {
            ...initialChannelsWithCallsState,
            'channel-2': true,
        };

        // setup
        const {result} = renderHook(() => {
            return [useCallsState('server1'), useCallsState('server1'), useChannelsWithCalls('server1')];
        });
        act(() => {
            setCallsState('server1', initialCallsState);
            setChannelsWithCalls('server1', initialChannelsWithCallsState);
        });
        assert.deepEqual(result.current[0], initialCallsState);
        assert.deepEqual(result.current[1], initialCallsState);
        assert.deepEqual(result.current[2], initialChannelsWithCallsState);

        // test
        act(() => setCalls('server1', 'myId', test.calls, test.enabled));
        assert.deepEqual(result.current[0], expectedCallsState);
        assert.deepEqual(result.current[1], expectedCallsState);
        assert.deepEqual(result.current[2], expectedChannelsWithCallsState);
    });

    it('joinedCall', () => {
        const initialCallsState = {
            ...DefaultCallsState,
            calls: {'channel-1': call1},
        };
        const initialChannelsWithCallsState = {
            'channel-1': true,
        };
        const initialCurrentCallState = {
            serverUrl: 'server1',
            myUserId: 'myUserId',
            ...call1,
            screenShareURL: '',
            speakerphoneOn: false,
        } as CurrentCall;
        const expectedCallsState = {
            'channel-1': {
                participants: {
                    'user-1': {id: 'user-1', muted: false, raisedHand: 0},
                    'user-2': {id: 'user-2', muted: true, raisedHand: 0},
                    'user-3': {id: 'user-3', muted: true, raisedHand: 0},
                },
                channelId: 'channel-1',
                startTime: 123,
                screenOn: '',
                threadId: 'thread-1',
                ownerId: 'user-1',
            },
        };
        const expectedChannelsWithCallsState = initialChannelsWithCallsState;
        const expectedCurrentCallState = {
            ...initialCurrentCallState,
            ...expectedCallsState['channel-1'],
        } as CurrentCall;

        // setup
        const {result} = renderHook(() => {
            return [useCallsState('server1'), useChannelsWithCalls('server1'), useCurrentCall()];
        });
        act(() => {
            setCallsState('server1', initialCallsState);
            setChannelsWithCalls('server1', initialChannelsWithCallsState);
            setCurrentCall(initialCurrentCallState);
        });
        assert.deepEqual(result.current[0], initialCallsState);
        assert.deepEqual(result.current[1], initialChannelsWithCallsState);
        assert.deepEqual(result.current[2], initialCurrentCallState);

        // test
        act(() => userJoinedCall('server1', 'channel-1', 'user-3'));
        assert.deepEqual((result.current[0] as CallsState).calls, expectedCallsState);
        assert.deepEqual(result.current[1], expectedChannelsWithCallsState);
        assert.deepEqual(result.current[2], expectedCurrentCallState);
        act(() => userJoinedCall('server1', 'invalid-channel', 'user-1'));
        assert.deepEqual((result.current[0] as CallsState).calls, expectedCallsState);
        assert.deepEqual(result.current[1], expectedChannelsWithCallsState);
        assert.deepEqual(result.current[2], expectedCurrentCallState);
    });

    it('leftCall', () => {
        const initialCallsState = {
            ...DefaultCallsState,
            calls: {'channel-1': call1},
        };
        const initialChannelsWithCallsState = {
            'channel-1': true,
        };
        const initialCurrentCallState = {
            serverUrl: 'server1',
            myUserId: 'myUserId',
            ...call1,
            screenShareURL: '',
            speakerphoneOn: false,
        } as CurrentCall;
        const expectedCallsState = {
            'channel-1': {
                participants: {
                    'user-2': {id: 'user-2', muted: true, raisedHand: 0},
                },
                channelId: 'channel-1',
                startTime: 123,
                screenOn: '',
                threadId: 'thread-1',
                ownerId: 'user-1',
            },
        };
        const expectedChannelsWithCallsState = initialChannelsWithCallsState;
        const expectedCurrentCallState = {
            ...initialCurrentCallState,
            ...expectedCallsState['channel-1'],
        } as CurrentCall;

        // setup
        const {result} = renderHook(() => {
            return [useCallsState('server1'), useChannelsWithCalls('server1'), useCurrentCall()];
        });
        act(() => {
            setCallsState('server1', initialCallsState);
            setChannelsWithCalls('server1', initialChannelsWithCallsState);
            setCurrentCall(initialCurrentCallState);
        });
        assert.deepEqual(result.current[0], initialCallsState);
        assert.deepEqual(result.current[1], initialChannelsWithCallsState);
        assert.deepEqual(result.current[2], initialCurrentCallState);

        // test
        act(() => userLeftCall('server1', 'channel-1', 'user-1'));
        assert.deepEqual((result.current[0] as CallsState).calls, expectedCallsState);
        assert.deepEqual(result.current[1], expectedChannelsWithCallsState);
        assert.deepEqual(result.current[2], expectedCurrentCallState);
        act(() => userLeftCall('server1', 'invalid-channel', 'user-2'));
        assert.deepEqual((result.current[0] as CallsState).calls, expectedCallsState);
        assert.deepEqual(result.current[1], expectedChannelsWithCallsState);
        assert.deepEqual(result.current[2], expectedCurrentCallState);
    });

    it('callStarted', () => {
        // setup
        const {result} = renderHook(() => {
            return [useCallsState('server1'), useChannelsWithCalls('server1'), useCurrentCall()];
        });
        assert.deepEqual(result.current[0], DefaultCallsState);
        assert.deepEqual(result.current[1], {});
        assert.deepEqual(result.current[2], null);

        // test
        act(() => callStarted('server1', call1));
        assert.deepEqual((result.current[0] as CallsState).calls, {'channel-1': call1});
        assert.deepEqual(result.current[1], {'channel-1': true});
        assert.deepEqual(result.current[2], null);
    });

    it('callEnded', () => {
        const initialCallsState = {
            ...DefaultCallsState,
            calls: {'channel-1': call1, 'channel-2': call2},
        };
        const initialChannelsWithCallsState = {'channel-1': true, 'channel-2': true};
        const expectedCallsState = {
            ...DefaultCallsState,
            calls: {'channel-2': call2},
        };
        const expectedChannelsWithCallsState = {'channel-2': true};

        // setup
        const {result} = renderHook(() => {
            return [useCallsState('server1'), useChannelsWithCalls('server1'), useCurrentCall()];
        });
        act(() => {
            setCallsState('server1', initialCallsState);
            setChannelsWithCalls('server1', initialChannelsWithCallsState);
        });
        assert.deepEqual(result.current[0], initialCallsState);
        assert.deepEqual(result.current[1], initialChannelsWithCallsState);
        assert.deepEqual(result.current[2], null);

        // test
        act(() => callEnded('server1', 'channel-1'));
        assert.deepEqual(result.current[0], expectedCallsState);
        assert.deepEqual(result.current[1], expectedChannelsWithCallsState);
        assert.deepEqual(result.current[2], null);
    });

    it('setUserMuted', () => {
        const initialCallsState = {
            ...DefaultCallsState,
            calls: {'channel-1': call1, 'channel-2': call2},
        };
        const initialChannelsWithCallsState = {'channel-1': true, 'channel-2': true};
        const initialCurrentCallState = {
            serverUrl: 'server1',
            myUserId: 'myUserId',
            ...call1,
            screenShareURL: '',
            speakerphoneOn: false,
        } as CurrentCall;

        // setup
        const {result} = renderHook(() => {
            return [useCallsState('server1'), useChannelsWithCalls('server1'), useCurrentCall()];
        });
        act(() => {
            setCallsState('server1', initialCallsState);
            setChannelsWithCalls('server1', initialChannelsWithCallsState);
            setCurrentCall(initialCurrentCallState);
        });
        assert.deepEqual(result.current[0], initialCallsState);
        assert.deepEqual(result.current[1], initialChannelsWithCallsState);
        assert.deepEqual(result.current[2], initialCurrentCallState);

        // test
        act(() => setUserMuted('server1', 'channel-1', 'user-1', true));
        assert.deepEqual((result.current[0] as CallsState).calls['channel-1'].participants['user-1'].muted, true);
        assert.deepEqual((result.current[2] as CurrentCall | null)?.participants['user-1'].muted, true);
        act(() => {
            setUserMuted('server1', 'channel-1', 'user-1', false);
            setUserMuted('server1', 'channel-1', 'user-2', false);
        });
        assert.deepEqual((result.current[0] as CallsState).calls['channel-1'].participants['user-1'].muted, false);
        assert.deepEqual((result.current[0] as CallsState).calls['channel-1'].participants['user-2'].muted, false);
        assert.deepEqual((result.current[2] as CurrentCall | null)?.participants['user-1'].muted, false);
        assert.deepEqual((result.current[2] as CurrentCall | null)?.participants['user-2'].muted, false);
        act(() => setUserMuted('server1', 'channel-1', 'user-2', true));
        assert.deepEqual((result.current[0] as CallsState).calls['channel-1'].participants['user-2'].muted, true);
        assert.deepEqual((result.current[2] as CurrentCall | null)?.participants['user-2'].muted, true);
        assert.deepEqual(result.current[0], initialCallsState);
        act(() => setUserMuted('server1', 'invalid-channel', 'user-1', true));
        assert.deepEqual(result.current[0], initialCallsState);
    });

    it('setCallScreenOn/Off', () => {
        const initialCallsState = {
            ...DefaultCallsState,
            calls: {'channel-1': call1, 'channel-2': call2},
        };
        const initialChannelsWithCallsState = {'channel-1': true, 'channel-2': true};
        const initialCurrentCallState = {
            serverUrl: 'server1',
            myUserId: 'myUserId',
            ...call1,
            screenShareURL: '',
            speakerphoneOn: false,
        } as CurrentCall;

        // setup
        const {result} = renderHook(() => {
            return [useCallsState('server1'), useChannelsWithCalls('server1'), useCurrentCall()];
        });
        act(() => {
            setCallsState('server1', initialCallsState);
            setChannelsWithCalls('server1', initialChannelsWithCallsState);
            setCurrentCall(initialCurrentCallState);
        });
        assert.deepEqual(result.current[0], initialCallsState);
        assert.deepEqual(result.current[1], initialChannelsWithCallsState);
        assert.deepEqual(result.current[2], initialCurrentCallState);

        // test
        act(() => setCallScreenOn('server1', 'channel-1', 'user-1'));
        assert.deepEqual((result.current[0] as CallsState).calls['channel-1'].screenOn, 'user-1');
        assert.deepEqual(result.current[1], initialChannelsWithCallsState);
        assert.deepEqual((result.current[2] as CurrentCall).screenOn, 'user-1');
        act(() => setCallScreenOff('server1', 'channel-1'));
        assert.deepEqual(result.current[0], initialCallsState);
        assert.deepEqual(result.current[1], initialChannelsWithCallsState);
        assert.deepEqual(result.current[2], initialCurrentCallState);
        act(() => setCallScreenOn('server1', 'channel-1', 'invalid-user'));
        assert.deepEqual(result.current[0], initialCallsState);
        assert.deepEqual(result.current[1], initialChannelsWithCallsState);
        assert.deepEqual(result.current[2], initialCurrentCallState);
        act(() => setCallScreenOff('server1', 'invalid-channel'));
        assert.deepEqual(result.current[0], initialCallsState);
        assert.deepEqual(result.current[1], initialChannelsWithCallsState);
        assert.deepEqual(result.current[2], initialCurrentCallState);
    });

    it('setRaisedHand', () => {
        const initialCallsState = {
            ...DefaultCallsState,
            calls: {'channel-1': call1},
        };
        const expectedCalls = {
            'channel-1': {
                participants: {
                    'user-1': {id: 'user-1', muted: false, raisedHand: 0},
                    'user-2': {id: 'user-2', muted: true, raisedHand: 345},
                },
                channelId: 'channel-1',
                startTime: 123,
                screenOn: false,
                threadId: 'thread-1',
                ownerId: 'user-1',
            },
        };
        const initialCurrentCallState = {
            serverUrl: 'server1',
            myUserId: 'myUserId',
            ...call1,
            screenShareURL: '',
            speakerphoneOn: false,
        } as CurrentCall;
        const expectedCurrentCallState = {
            ...initialCurrentCallState,
            ...expectedCalls['channel-1'],
        };

        // setup
        const {result} = renderHook(() => {
            return [useCallsState('server1'), useCurrentCall()];
        });
        act(() => {
            setCallsState('server1', initialCallsState);
            setCurrentCall(initialCurrentCallState);
        });
        assert.deepEqual(result.current[0], initialCallsState);
        assert.deepEqual(result.current[1], initialCurrentCallState);

        // test
        act(() => setRaisedHand('server1', 'channel-1', 'user-2', 345));
        assert.deepEqual((result.current[0] as CallsState).calls, expectedCalls);
        assert.deepEqual((result.current[1] as CurrentCall | null), expectedCurrentCallState);

        act(() => setRaisedHand('server1', 'invalid-channel', 'user-1', 345));
        assert.deepEqual((result.current[0] as CallsState).calls, expectedCalls);
        assert.deepEqual((result.current[1] as CurrentCall | null), expectedCurrentCallState);

        // unraise hand:
        act(() => setRaisedHand('server1', 'channel-1', 'user-2', 0));
        assert.deepEqual(result.current[0], initialCallsState);
        assert.deepEqual(result.current[1], initialCurrentCallState);
    });

    it('myselfJoinedCall / LeftCall', () => {
        const initialCallsState = {
            ...DefaultCallsState,
            myUserId: 'myUserId',
            calls: {'channel-1': call1, 'channel-2': call2},
        };
        const expectedCurrentCallState = {
            serverUrl: 'server1',
            myUserId: 'myUserId',
            screenShareURL: '',
            speakerphoneOn: false,
            ...call1,
        } as CurrentCall;

        // setup
        const {result} = renderHook(() => {
            return [useCallsState('server1'), useCurrentCall()];
        });
        act(() => setCallsState('server1', initialCallsState));
        assert.deepEqual(result.current[0], initialCallsState);
        assert.deepEqual(result.current[1], null);

        // test
        act(() => myselfJoinedCall('server1', 'channel-1'));
        assert.deepEqual(result.current[0], initialCallsState);
        assert.deepEqual(result.current[1], expectedCurrentCallState);
        act(() => myselfLeftCall());
        assert.deepEqual(result.current[0], initialCallsState);
        assert.deepEqual(result.current[1], null);
    });

    it('setChannelEnabled', () => {
        const initialState = {
            ...DefaultCallsState,
            enabled: {'channel-1': true, 'channel-2': false},
        };

        // setup
        const {result} = renderHook(() => useCallsState('server1'));
        act(() => setCallsState('server1', initialState));
        assert.deepEqual(result.current, initialState);

        // test setCalls affects enabled:
        act(() => setCalls('server1', 'myUserId', {}, {'channel-1': true}));
        assert.deepEqual(result.current.enabled, {'channel-1': true});

        // re-setup:
        act(() => setCallsState('server1', initialState));
        assert.deepEqual(result.current, initialState);

        // test setChannelEnabled affects enabled:
        act(() => setChannelEnabled('server1', 'channel-3', true));
        assert.deepEqual(result.current.enabled, {'channel-1': true, 'channel-2': false, 'channel-3': true});
        act(() => setChannelEnabled('server1', 'channel-3', false));
        assert.deepEqual(result.current.enabled, {
            'channel-1': true,
            'channel-2': false,
            'channel-3': false,
        });
        act(() => setChannelEnabled('server1', 'channel-1', true));
        assert.deepEqual(result.current.enabled, {
            'channel-1': true,
            'channel-2': false,
            'channel-3': false,
        });
        act(() => setChannelEnabled('server1', 'channel-1', false));
        assert.deepEqual(result.current.enabled, {
            'channel-1': false,
            'channel-2': false,
            'channel-3': false,
        });
    });

    it('setScreenShareURL', () => {
        const initialCallsState = {
            ...DefaultCallsState,
            myUserId: 'myUserId',
            calls: {'channel-1': call1, 'channel-2': call2},
        };

        // setup
        const {result} = renderHook(() => {
            return [useCallsState('server1'), useCurrentCall()];
        });
        act(() => setCallsState('server1', initialCallsState));
        assert.deepEqual(result.current[0], initialCallsState);
        assert.deepEqual(result.current[1], null);

        // test joining a call and setting url:
        act(() => myselfJoinedCall('server1', 'channel-1'));
        assert.deepEqual((result.current[1] as CurrentCall | null)?.screenShareURL, '');
        act(() => setScreenShareURL('testUrl'));
        assert.deepEqual((result.current[1] as CurrentCall | null)?.screenShareURL, 'testUrl');

        act(() => {
            myselfLeftCall();
            setScreenShareURL('test');
        });
        assert.deepEqual(result.current[0], initialCallsState);
        assert.deepEqual(result.current[1], null);
    });

    it('setSpeakerPhoneOn', () => {
        const initialCallsState = {
            ...DefaultCallsState,
            myUserId: 'myUserId',
            calls: {'channel-1': call1, 'channel-2': call2},
        };

        // setup
        const {result} = renderHook(() => {
            return [useCallsState('server1'), useCurrentCall()];
        });
        act(() => setCallsState('server1', initialCallsState));
        assert.deepEqual(result.current[0], initialCallsState);
        assert.deepEqual(result.current[1], null);

        // test
        act(() => myselfJoinedCall('server1', 'channel-1'));
        assert.deepEqual((result.current[1] as CurrentCall | null)?.speakerphoneOn, false);
        act(() => setSpeakerPhone(true));
        assert.deepEqual((result.current[1] as CurrentCall | null)?.speakerphoneOn, true);
        act(() => setSpeakerPhone(false));
        assert.deepEqual((result.current[1] as CurrentCall | null)?.speakerphoneOn, false);
        assert.deepEqual(result.current[0], initialCallsState);
        act(() => {
            myselfLeftCall();
            setSpeakerPhone(true);
        });
        assert.deepEqual(result.current[0], initialCallsState);
        assert.deepEqual(result.current[1], null);
    });

    it('config', () => {
        const newConfig = {
            ICEServers: [],
            ICEServersConfigs: [
                {
                    urls: ['stun:stun.example.com:3478'],
                },
                {
                    urls: ['turn:turn.example.com:3478'],
                },
            ],
            AllowEnableCalls: true,
            DefaultEnabled: true,
            NeedsTURNCredentials: false,
            last_retrieved_at: 123,
        };

        // setup
        const {result} = renderHook(() => useCallsConfig('server1'));
        assert.deepEqual(result.current, DefaultCallsConfig);

        // test
        act(() => setConfig('server1', newConfig));
        assert.deepEqual(result.current, {...newConfig, pluginEnabled: false});
        act(() => setPluginEnabled('server1', true));
        assert.deepEqual(result.current, {...newConfig, pluginEnabled: true});
        act(() => setPluginEnabled('server1', false));
        assert.deepEqual(result.current, {...newConfig, pluginEnabled: false});
    });
});
