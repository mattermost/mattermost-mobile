// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'assert';

import {act, renderHook} from '@testing-library/react-hooks';

import {needsRecordingAlert} from '@calls/alerts';
import {
    newCurrentCall,
    setCallsState,
    setChannelsWithCalls,
    setCurrentCall,
    setHost,
    setMicPermissionsErrorDismissed,
    setMicPermissionsGranted,
    setRecordingState,
    useCallsConfig,
    useCallsState,
    useChannelsWithCalls,
    useCurrentCall,
    useGlobalCallsState,
    userReacted,
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
    myselfLeftCall,
    setChannelEnabled,
    setScreenShareURL,
    setSpeakerPhone,
    setConfig,
    setPluginEnabled,
    setUserVoiceOn,
} from '@calls/state/actions';
import {
    Call,
    CallsState,
    CurrentCall,
    DefaultCallsConfig,
    DefaultCallsState,
    DefaultCurrentCall,
    DefaultGlobalCallsState,
    GlobalCallsState,
} from '@calls/types/calls';
import {License} from '@constants';

import type {CallRecordingState} from '@mattermost/calls/lib/types';

jest.mock('@calls/alerts');

const call1: Call = {
    participants: {
        'user-1': {id: 'user-1', muted: false, raisedHand: 0},
        'user-2': {id: 'user-2', muted: true, raisedHand: 0},
    },
    channelId: 'channel-1',
    startTime: 123,
    screenOn: '',
    threadId: 'thread-1',
    ownerId: 'user-1',
    hostId: 'user-1',
};
const call2: Call = {
    participants: {
        'user-3': {id: 'user-3', muted: false, raisedHand: 0},
        'user-4': {id: 'user-4', muted: true, raisedHand: 0},
    },
    channelId: 'channel-2',
    startTime: 123,
    screenOn: '',
    threadId: 'thread-2',
    ownerId: 'user-3',
    hostId: 'user-3',
};
const call3: Call = {
    participants: {
        'user-5': {id: 'user-5', muted: false, raisedHand: 0},
        'user-6': {id: 'user-6', muted: true, raisedHand: 0},
    },
    channelId: 'channel-3',
    startTime: 123,
    screenOn: '',
    threadId: 'thread-3',
    ownerId: 'user-5',
    hostId: 'user-5',
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
        const initialCurrentCallState: CurrentCall = {
            ...DefaultCurrentCall,
            serverUrl: 'server1',
            myUserId: 'myUserId',
            ...call1,
        };
        const testNewCall1 = {
            ...call1,
            participants: {
                'user-1': {id: 'user-1', muted: false, raisedHand: 0},
                'user-2': {id: 'user-2', muted: true, raisedHand: 0},
                'user-3': {id: 'user-3', muted: false, raisedHand: 123},
            },
        };
        const test = {
            calls: {'channel-1': testNewCall1, 'channel-2': call2, 'channel-3': call3},
            enabled: {'channel-2': true},
        };

        const expectedCallsState = {
            ...initialCallsState,
            myUserId: 'myId',
            calls: {'channel-1': testNewCall1, 'channel-2': call2, 'channel-3': call3},
            enabled: {'channel-2': true},
        };
        const expectedChannelsWithCallsState = {
            ...initialChannelsWithCallsState,
            'channel-2': true,
            'channel-3': true,
        };
        const expectedCurrentCallState = {
            ...initialCurrentCallState,
            ...testNewCall1,
        };

        // setup
        const {result} = renderHook(() => {
            return [
                useCallsState('server1'),
                useCallsState('server1'),
                useChannelsWithCalls('server1'),
                useCurrentCall(),
            ];
        });
        act(() => {
            setCallsState('server1', initialCallsState);
            setChannelsWithCalls('server1', initialChannelsWithCallsState);
            setCurrentCall(initialCurrentCallState);
        });
        assert.deepEqual(result.current[0], initialCallsState);
        assert.deepEqual(result.current[1], initialCallsState);
        assert.deepEqual(result.current[2], initialChannelsWithCallsState);
        assert.deepEqual(result.current[3], initialCurrentCallState);

        // test
        act(() => setCalls('server1', 'myId', test.calls, test.enabled));
        assert.deepEqual(result.current[0], expectedCallsState);
        assert.deepEqual(result.current[1], expectedCallsState);
        assert.deepEqual(result.current[2], expectedChannelsWithCallsState);
        assert.deepEqual(result.current[3], expectedCurrentCallState);
    });

    it('joinedCall', () => {
        const initialCallsState = {
            ...DefaultCallsState,
            calls: {'channel-1': call1},
        };
        const initialChannelsWithCallsState = {
            'channel-1': true,
        };

        const initialCurrentCallState: CurrentCall = {
            ...DefaultCurrentCall,
            connected: true,
            serverUrl: 'server1',
            myUserId: 'myUserId',
            ...call1,
        };
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
                hostId: 'user-1',
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
        const initialCurrentCallState: CurrentCall = {
            ...DefaultCurrentCall,
            connected: true,
            serverUrl: 'server1',
            myUserId: 'myUserId',
            ...call1,
        };
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
                hostId: 'user-1',
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

    it('leftCall with screensharing on', () => {
        const initialCallsState: CallsState = {
            ...DefaultCallsState,
            calls: {
                'channel-1': {
                    ...call1,
                    screenOn: 'user-1',
                },
            },
        };
        const initialChannelsWithCallsState = {
            'channel-1': true,
        };
        const initialCurrentCallState: CurrentCall = {
            ...DefaultCurrentCall,
            connected: true,
            serverUrl: 'server1',
            myUserId: 'myUserId',
            ...call1,
            screenOn: 'user-1',
        };
        const expectedCallsState = {
            'channel-1': {
                participants: {
                    'user-2': {id: 'user-2', muted: true, raisedHand: 0},
                },
                channelId: 'channel-1',
                startTime: 123,
                threadId: 'thread-1',
                ownerId: 'user-1',
                hostId: 'user-1',
                screenOn: '',
            },
        };
        const expectedChannelsWithCallsState = initialChannelsWithCallsState;
        const expectedCurrentCallState: CurrentCall = {
            ...initialCurrentCallState,
            ...expectedCallsState['channel-1'],
        };

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
        const initialCurrentCallState: CurrentCall = {
            ...DefaultCurrentCall,
            connected: true,
            serverUrl: 'server1',
            myUserId: 'myUserId',
            ...call1,
        };

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
        const initialCurrentCallState: CurrentCall = {
            ...DefaultCurrentCall,
            serverUrl: 'server1',
            myUserId: 'myUserId',
            ...call1,
        };

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
                hostId: 'user-1',
            },
        };
        const initialCurrentCallState: CurrentCall = {
            ...DefaultCurrentCall,
            connected: true,
            serverUrl: 'server1',
            myUserId: 'myUserId',
            ...call1,
        };
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
        const newCall1 = {
            ...call1,
            participants: {
                ...call1.participants,
                myUserId: {id: 'myUserId', muted: true, raisedHand: 0},
            },
        };
        const expectedCallsState = {
            ...initialCallsState,
            calls: {
                ...initialCallsState.calls,
                'channel-1': newCall1,
            },
        };
        const expectedCurrentCallState: CurrentCall = {
            ...DefaultCurrentCall,
            connected: true,
            serverUrl: 'server1',
            myUserId: 'myUserId',
            ...newCall1,
        };

        // setup
        const {result} = renderHook(() => {
            return [useCallsState('server1'), useCurrentCall()];
        });
        act(() => setCallsState('server1', initialCallsState));
        assert.deepEqual(result.current[0], initialCallsState);
        assert.deepEqual(result.current[1], null);

        // test
        act(() => {
            newCurrentCall('server1', 'channel-1', 'myUserId');
            userJoinedCall('server1', 'channel-1', 'myUserId');
        });
        assert.deepEqual(result.current[0], expectedCallsState);
        assert.deepEqual(result.current[1], expectedCurrentCallState);

        act(() => {
            myselfLeftCall();
            userLeftCall('server1', 'channel-1', 'myUserId');
        });
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
        act(() => newCurrentCall('server1', 'channel-1', 'myUserId'));
        act(() => userJoinedCall('server1', 'channel-1', 'myUserId'));
        assert.deepEqual((result.current[1] as CurrentCall | null)?.screenShareURL, '');
        act(() => setScreenShareURL('testUrl'));
        assert.deepEqual((result.current[1] as CurrentCall | null)?.screenShareURL, 'testUrl');

        act(() => {
            myselfLeftCall();
            userLeftCall('server1', 'channel-1', 'myUserId');
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
        const newCall1 = {
            ...call1,
            participants: {
                ...call1.participants,
                myUserId: {id: 'myUserId', muted: true, raisedHand: 0},
            },
        };
        const expectedCallsState = {
            ...initialCallsState,
            calls: {
                ...initialCallsState.calls,
                'channel-1': newCall1,
            },
        };

        // setup
        const {result} = renderHook(() => {
            return [useCallsState('server1'), useCurrentCall()];
        });
        act(() => setCallsState('server1', initialCallsState));
        assert.deepEqual(result.current[0], initialCallsState);
        assert.deepEqual(result.current[1], null);

        // test
        act(() => newCurrentCall('server1', 'channel-1', 'myUserId'));
        act(() => userJoinedCall('server1', 'channel-1', 'myUserId'));
        assert.deepEqual((result.current[1] as CurrentCall | null)?.speakerphoneOn, false);
        act(() => setSpeakerPhone(true));
        assert.deepEqual((result.current[1] as CurrentCall | null)?.speakerphoneOn, true);
        act(() => setSpeakerPhone(false));
        assert.deepEqual((result.current[1] as CurrentCall | null)?.speakerphoneOn, false);
        assert.deepEqual(result.current[0], expectedCallsState);
        act(() => {
            myselfLeftCall();
            setSpeakerPhone(true);
        });
        assert.deepEqual(result.current[0], expectedCallsState);
        assert.deepEqual(result.current[1], null);
    });

    it('MicPermissions', () => {
        const initialGlobalState = DefaultGlobalCallsState;
        const initialCallsState: CallsState = {
            ...DefaultCallsState,
            myUserId: 'myUserId',
            calls: {'channel-1': call1, 'channel-2': call2},
        };
        const newCall1: Call = {
            ...call1,
            participants: {
                ...call1.participants,
                myUserId: {id: 'myUserId', muted: true, raisedHand: 0},
            },
        };
        const expectedCallsState: CallsState = {
            ...initialCallsState,
            calls: {
                ...initialCallsState.calls,
                'channel-1': newCall1,
            },
        };
        const expectedCurrentCallState: CurrentCall = {
            ...DefaultCurrentCall,
            serverUrl: 'server1',
            myUserId: 'myUserId',
            connected: true,
            ...newCall1,
        };
        const secondExpectedCurrentCallState: CurrentCall = {
            ...expectedCurrentCallState,
            micPermissionsErrorDismissed: true,
        };
        const expectedGlobalState: GlobalCallsState = {
            micPermissionsGranted: true,
        };

        // setup
        const {result} = renderHook(() => {
            return [useCallsState('server1'), useCurrentCall(), useGlobalCallsState()];
        });
        act(() => setCallsState('server1', initialCallsState));
        assert.deepEqual(result.current[0], initialCallsState);
        assert.deepEqual(result.current[1], null);
        assert.deepEqual(result.current[2], initialGlobalState);

        // join call
        act(() => {
            setMicPermissionsGranted(false);
            newCurrentCall('server1', 'channel-1', 'myUserId');
            userJoinedCall('server1', 'channel-1', 'myUserId');
        });
        assert.deepEqual(result.current[0], expectedCallsState);
        assert.deepEqual(result.current[1], expectedCurrentCallState);
        assert.deepEqual(result.current[2], initialGlobalState);

        // dismiss mic error
        act(() => setMicPermissionsErrorDismissed());
        assert.deepEqual(result.current[0], expectedCallsState);
        assert.deepEqual(result.current[1], secondExpectedCurrentCallState);
        assert.deepEqual(result.current[2], initialGlobalState);

        // grant permissions
        act(() => setMicPermissionsGranted(true));
        assert.deepEqual(result.current[0], expectedCallsState);
        assert.deepEqual(result.current[1], secondExpectedCurrentCallState);
        assert.deepEqual(result.current[2], expectedGlobalState);

        act(() => {
            myselfLeftCall();
            userLeftCall('server1', 'channel-1', 'myUserId');
        });
        assert.deepEqual(result.current[0], initialCallsState);
        assert.deepEqual(result.current[1], null);
    });

    it('voiceOn and Off', () => {
        const initialCallsState = {
            ...DefaultCallsState,
            myUserId: 'myUserId',
            calls: {'channel-1': call1, 'channel-2': call2},
        };
        const initialCurrentCallState: CurrentCall = {
            ...DefaultCurrentCall,
            serverUrl: 'server1',
            myUserId: 'myUserId',
            ...call1,
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
        act(() => setUserVoiceOn('channel-1', 'user-1', true));
        assert.deepEqual(result.current[1], {...initialCurrentCallState, voiceOn: {'user-1': true}});
        assert.deepEqual(result.current[0], initialCallsState);
        act(() => setUserVoiceOn('channel-1', 'user-2', true));
        assert.deepEqual(result.current[1], {...initialCurrentCallState, voiceOn: {'user-1': true, 'user-2': true}});
        assert.deepEqual(result.current[0], initialCallsState);
        act(() => setUserVoiceOn('channel-1', 'user-1', false));
        assert.deepEqual(result.current[1], {...initialCurrentCallState, voiceOn: {'user-2': true}});
        assert.deepEqual(result.current[0], initialCallsState);

        // test that voice state is cleared on reconnect
        act(() => setCalls('server1', 'myUserId', initialCallsState.calls, {}));
        assert.deepEqual(result.current[1], initialCurrentCallState);
        assert.deepEqual(result.current[0], initialCallsState);
    });

    it('config', () => {
        const newConfig = {
            ...DefaultCallsConfig,
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
            sku_short_name: License.SKU_SHORT_NAME.Professional,
            MaxCallParticipants: 8,
            EnableRecordings: true,
            bot_user_id: '',
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

    it('user reactions', () => {
        const initialCallsState = {
            ...DefaultCallsState,
            serverUrl: 'server1',
            myUserId: 'myUserId',
            calls: {'channel-1': call1, 'channel-2': call2},
        };
        const initialCurrentCallState: CurrentCall = {
            ...DefaultCurrentCall,
            serverUrl: 'server1',
            myUserId: 'myUserId',
            ...call1,
        };
        const expectedCurrentCallState: CurrentCall = {
            ...initialCurrentCallState,
            reactionStream: [
                {name: 'smile', latestTimestamp: 202, count: 1, literal: undefined},
                {name: '+1', latestTimestamp: 145, count: 2, literal: undefined},
            ],
            participants: {
                ...initialCurrentCallState.participants,
                'user-1': {
                    ...initialCurrentCallState.participants['user-1'],
                    reaction: {
                        user_id: 'user-1',
                        emoji: {name: 'smile', unified: 'something'},
                        timestamp: 202,
                    },
                },
                'user-2': {
                    ...initialCurrentCallState.participants['user-2'],
                    reaction: {
                        user_id: 'user-2',
                        emoji: {name: '+1', unified: 'something'},
                        timestamp: 123,
                    },
                },
            },
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
        act(() => {
            userReacted('server1', 'channel-1', {
                user_id: 'user-2',
                emoji: {name: '+1', unified: 'something'},
                timestamp: 123,
            });
            userReacted('server1', 'channel-1', {
                user_id: 'user-1',
                emoji: {name: '+1', unified: 'something'},
                timestamp: 145,
            });
            userReacted('server1', 'channel-1', {
                user_id: 'user-1',
                emoji: {name: 'smile', unified: 'something'},
                timestamp: 202,
            });
        });
        assert.deepEqual(result.current[0], initialCallsState);
        assert.deepEqual(result.current[1], expectedCurrentCallState);
    });

    it('setRecordingState', () => {
        const initialCallsState = {
            ...DefaultCallsState,
            calls: {'channel-1': call1, 'channel-2': call2},
        };
        const initialCurrentCallState: CurrentCall = {
            ...DefaultCurrentCall,
            connected: true,
            serverUrl: 'server1',
            myUserId: 'myUserId',
            ...call1,
        };
        const recState: CallRecordingState = {
            init_at: 123,
            start_at: 231,
            end_at: 345,
        };
        const expectedCallsState: CallsState = {
            ...initialCallsState,
            calls: {
                ...initialCallsState.calls,
                'channel-1': {
                    ...call1,
                    recState,
                },
            },
        };
        const expectedCurrentCallState: CurrentCall = {
            ...DefaultCurrentCall,
            connected: true,
            serverUrl: 'server1',
            myUserId: 'myUserId',
            ...call1,
            recState,
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
        act(() => setRecordingState('server1', 'channel-1', recState));
        assert.deepEqual((result.current[0] as CallsState), expectedCallsState);
        assert.deepEqual((result.current[1] as CurrentCall | null), expectedCurrentCallState);
        act(() => setRecordingState('server1', 'channel-2', recState));
        assert.deepEqual((result.current[0] as CallsState).calls['channel-2'], {...call2, recState});
        assert.deepEqual((result.current[1] as CurrentCall | null), expectedCurrentCallState);
        act(() => setRecordingState('server1', 'channel-1', {...recState, start_at: recState.start_at + 1}));
        expect(needsRecordingAlert).toBeCalled();
    });

    it('setHost', () => {
        const initialCallsState = {
            ...DefaultCallsState,
            calls: {'channel-1': call1, 'channel-2': call2},
        };
        const initialCurrentCallState: CurrentCall = {
            ...DefaultCurrentCall,
            connected: true,
            serverUrl: 'server1',
            myUserId: 'myUserId',
            ...call1,
        };
        const expectedCallsState: CallsState = {
            ...initialCallsState,
            calls: {
                ...initialCallsState.calls,
                'channel-1': {
                    ...call1,
                    hostId: 'user-52',
                },
            },
        };
        const expectedCurrentCallState: CurrentCall = {
            ...DefaultCurrentCall,
            connected: true,
            serverUrl: 'server1',
            myUserId: 'myUserId',
            ...call1,
            hostId: 'user-52',
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
        act(() => setHost('server1', 'channel-1', 'user-52'));
        assert.deepEqual((result.current[0] as CallsState), expectedCallsState);
        assert.deepEqual((result.current[1] as CurrentCall | null), expectedCurrentCallState);
        act(() => setHost('server1', 'channel-2', 'user-1923'));
        assert.deepEqual((result.current[0] as CallsState).calls['channel-2'], {...call2, hostId: 'user-1923'});
        assert.deepEqual((result.current[1] as CurrentCall | null), expectedCurrentCallState);
        act(() => setHost('server1', 'channel-1', 'myUserId'));
        expect(needsRecordingAlert).toBeCalled();
    });
});
