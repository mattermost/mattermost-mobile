// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import assert from 'assert';

import CallsNative from '@mattermost/calls-native';
import {act, renderHook} from '@testing-library/react-native';
import {AppState, Platform} from 'react-native';

import {needsRecordingAlert} from '@calls/alerts';
import {
    newCurrentCall,
    processIncomingCalls,
    processMeanOpinionScore,
    receivedCaption,
    removeIncomingCall,
    setAudioDeviceInfo,
    setCallQualityAlertDismissed,
    setCallsConfig,
    setCallsState,
    setChannelsWithCalls,
    setCurrentCall,
    setHost,
    setIncomingCalls,
    setJoiningChannelId,
    setMicPermissionsErrorDismissed,
    setMicPermissionsGranted,
    setRecordingState,
    useCallsConfig,
    useCallsState,
    useChannelsWithCalls,
    setCurrentCallConnected,
    useCurrentCall,
    useGlobalCallsState,
    useIncomingCalls,
    userReacted,
    setCallForChannel,
} from '@calls/state';
import {
    callEnded,
    callStarted,
    cancelOutgoingCall,
    clearStartUnmuted,
    myselfLeftCall,
    setCalls,
    setCallScreenOff,
    setCallScreenOn,
    setChannelEnabled,
    setConfig,
    setPluginEnabled,
    setRaisedHand,
    setScreenShareURL,
    setUserMuted,
    setUserVoiceOn,
    userJoinedCall,
    userLeftCall,
    callsOnAppStateChange,
    playIncomingCallsRinging,
    startOutgoingCall,
    stopRingback,
} from '@calls/state/actions';
import {
    AudioDevice,
    type Call,
    type CallsState,
    type CurrentCall,
    DefaultCall,
    DefaultCallsConfig,
    DefaultCallsState,
    DefaultCurrentCall,
    DefaultGlobalCallsState,
    DefaultIncomingCalls,
    type GlobalCallsState,
    type IncomingCalls,
} from '@calls/types/calls';
import {License} from '@constants';
import Calls from '@constants/calls';
import DatabaseManager from '@database/manager';
import {getChannelById} from '@queries/servers/channel';
import {getCurrentUser, getUserById} from '@queries/servers/user';
import TestHelper from '@test/test_helper';
import {advanceTimers, disableFakeTimers, enableFakeTimers} from '@test/timer_helpers';

import type {CallJobState, LiveCaptionData} from '@mattermost/calls/lib/types';

jest.mock('@calls/alerts');
jest.mock('@calls/native_call', () => ({
    endNativeCall: jest.fn(),
}));

jest.mock('@constants/calls', () => {
    const actual = jest.requireActual('@constants/calls');
    return {
        __esModule: true,
        ...actual,
        default: {
            ...actual.default,
            CALL_QUALITY_RESET_MS: 100,
        },
    };
});

jest.mock('@actions/remote/thread', () => ({
    updateThreadFollowing: jest.fn(() => Promise.resolve({})),
}));

jest.mock('@queries/servers/thread', () => ({
    getThreadById: jest.fn(() => Promise.resolve({
        isFollowing: false,
    })),
}));

jest.mock('@queries/servers/channel', () => ({
    getChannelById: jest.fn(() => Promise.resolve({
        type: 'D',
    })),
}));

jest.mock('@queries/servers/user', () => ({
    getUserById: jest.fn(),
    getCurrentUser: jest.fn(),
}));

const user5 = TestHelper.fakeUserModel({username: 'user-5'});
jest.mocked(getUserById).mockResolvedValue(user5);

const call1: Call = {
    id: 'call1',
    sessions: {
        session1: {sessionId: 'session1', userId: 'user-1', muted: false, raisedHand: 0},
        session2: {sessionId: 'session2', userId: 'user-2', muted: true, raisedHand: 0},
    },
    channelId: 'channel-1',
    startTime: 123,
    screenOn: '',
    threadId: 'thread-1',
    ownerId: 'user-1',
    hostId: 'user-1',
    dismissed: {},
};
const call2: Call = {
    id: 'call2',
    sessions: {
        session3: {sessionId: 'session3', userId: 'user-3', muted: false, raisedHand: 0},
        session4: {sessionId: 'session4', userId: 'user-4', muted: true, raisedHand: 0},
    },
    channelId: 'channel-2',
    startTime: 123,
    screenOn: '',
    threadId: 'thread-2',
    ownerId: 'user-3',
    hostId: 'user-3',
    dismissed: {},
};
const call3: Call = {
    id: 'call3',
    sessions: {
        session5: {sessionId: 'session5', userId: 'user-5', muted: false, raisedHand: 0},
        session6: {sessionId: 'session6', userId: 'user-6', muted: true, raisedHand: 0},
    },
    channelId: 'channel-3',
    startTime: 123,
    screenOn: '',
    threadId: 'thread-3',
    ownerId: 'user-5',
    hostId: 'user-5',
    dismissed: {},
};
const callDM: Call = {
    id: 'callDM',
    sessions: {
        session5: {sessionId: 'session5', userId: 'user-5', muted: false, raisedHand: 0},
    },
    channelId: 'channel-private',
    startTime: 123,
    screenOn: '',
    threadId: 'thread-4',
    ownerId: 'user-5',
    hostId: 'user-5',
    dismissed: {},
};

// userJoinedCall stamps dmCalleeAnsweredAt with the current time when I join a call someone else is already in,
// so tests that assert on the whole current call need that moment to be deterministic.
const ANSWERED_AT = 1700000000000;
const atAnsweredTime = (fn: () => void) => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(ANSWERED_AT);
    try {
        fn();
    } finally {
        now.mockRestore();
    }
};

describe('useCallsState', () => {
    const {updateThreadFollowing} = require('@actions/remote/thread');

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
        updateThreadFollowing.mockClear();

        act(() => {
            setCallsState('server1', DefaultCallsState);
            setChannelsWithCalls('server1', {});
            setCurrentCall(null);
        });
    });

    afterEach(async () => {
        // Several actions leave long-lived timers behind (reaction, caption and ring expiry).
        // Dropping the fake clock discards them so Jest can exit.
        disableFakeTimers();
        await DatabaseManager.destroyServerDatabase('server1');
    });

    it('default state', () => {
        const {result} = renderHook(() => {
            return [useCallsState('server1'), useChannelsWithCalls('server1')];
        });
        assert.deepEqual(result.current[0], DefaultCallsState);
        assert.deepEqual(result.current[1], {});
    });

    it('setCalls, two callsState hooks, channelsWithCalls hook, ', async () => {
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
            sessions: {
                session1: {sessionId: 'session1', userId: 'user-1', muted: false, raisedHand: 0},
                session2: {sessionId: 'session2', userId: 'user-2', muted: true, raisedHand: 0},
                session3: {sessionId: 'session3', userId: 'user-3', muted: false, raisedHand: 123},
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
        await act(async () => setCalls('server1', 'myId', test.calls, test.enabled));
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
                id: 'call1',
                sessions: {
                    session1: {sessionId: 'session1', userId: 'user-1', muted: false, raisedHand: 0},
                    session2: {sessionId: 'session2', userId: 'user-2', muted: true, raisedHand: 0},
                    session3: {sessionId: 'session3', userId: 'user-3', muted: true, raisedHand: 0},
                },
                channelId: 'channel-1',
                startTime: 123,
                screenOn: '',
                threadId: 'thread-1',
                ownerId: 'user-1',
                hostId: 'user-1',
                dismissed: {},
            },
        };
        const expectedChannelsWithCallsState = initialChannelsWithCallsState;
        const expectedCurrentCallState: CurrentCall = {
            ...initialCurrentCallState,
            ...expectedCallsState['channel-1'],
            dmCalleeAnsweredAt: ANSWERED_AT,
        };

        // setup
        const {result} = renderHook(() => {
            return [useCallsState('server1'), useChannelsWithCalls('server1'), useCurrentCall()] as const;
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
        act(() => atAnsweredTime(() => userJoinedCall('server1', 'channel-1', 'user-3', 'session3')));
        assert.deepEqual(result.current[0].calls, expectedCallsState);
        assert.deepEqual(result.current[1], expectedChannelsWithCallsState);
        assert.deepEqual(result.current[2], expectedCurrentCallState);
        act(() => userJoinedCall('server1', 'invalid-channel', 'user-1', 'session1'));
        assert.deepEqual(result.current[0].calls, expectedCallsState);
        assert.deepEqual(result.current[1], expectedChannelsWithCallsState);
        assert.deepEqual(result.current[2], expectedCurrentCallState);
    });

    it('should stamp dmCalleeAnsweredAt the first time the call holds two distinct users', () => {
        const emptyCall: Call = {
            ...callDM,
            channelId: 'channel-1',
            sessions: {},
        };
        const setUpCall = (call: Call) => {
            act(() => {
                setCallsState('server1', {...DefaultCallsState, myUserId: 'myUserId', calls: {'channel-1': call}});
                setCurrentCall({
                    ...DefaultCurrentCall,
                    ...call,
                    serverUrl: 'server1',
                    myUserId: 'myUserId',
                });
            });
        };
        const {result} = renderHook(() => useCurrentCall());

        // Joining a call nobody else is in yet: there is nothing to count from.
        setUpCall(emptyCall);
        act(() => atAnsweredTime(() => userJoinedCall('server1', 'channel-1', 'myUserId', 'mySessionId')));
        assert.equal(result.current?.dmCalleeAnsweredAt, undefined);

        // The other party joining is what answers the call for the caller.
        act(() => atAnsweredTime(() => userJoinedCall('server1', 'channel-1', 'user-2', 'session2')));
        assert.equal(result.current?.dmCalleeAnsweredAt, ANSWERED_AT);

        // A later joiner doesn't move that moment.
        act(() => userJoinedCall('server1', 'channel-1', 'user-3', 'session3'));
        assert.equal(result.current?.dmCalleeAnsweredAt, ANSWERED_AT);

        // Joining a call another user is already in: for the callee, that's the moment it was answered.
        setUpCall({
            ...emptyCall,
            sessions: {session2: {sessionId: 'session2', userId: 'user-2', muted: true, raisedHand: 0}},
        });
        act(() => atAnsweredTime(() => userJoinedCall('server1', 'channel-1', 'myUserId', 'mySessionId')));
        assert.equal(result.current?.dmCalleeAnsweredAt, ANSWERED_AT);

        // Another device of mine joining later doesn't move that moment.
        act(() => userJoinedCall('server1', 'channel-1', 'myUserId', 'myOtherSessionId'));
        assert.equal(result.current?.dmCalleeAnsweredAt, ANSWERED_AT);
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
                id: 'call1',
                sessions: {
                    session2: {sessionId: 'session2', userId: 'user-2', muted: true, raisedHand: 0},
                },
                channelId: 'channel-1',
                startTime: 123,
                screenOn: '',
                threadId: 'thread-1',
                ownerId: 'user-1',
                hostId: 'user-1',
                dismissed: {},
            },
        };
        const expectedChannelsWithCallsState = initialChannelsWithCallsState;
        const expectedCurrentCallState: CurrentCall = {
            ...initialCurrentCallState,
            ...expectedCallsState['channel-1'],
        };

        // setup
        const {result} = renderHook(() => {
            return [useCallsState('server1'), useChannelsWithCalls('server1'), useCurrentCall()] as const;
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
        act(() => userLeftCall('server1', 'channel-1', 'session1'));
        assert.deepEqual(result.current[0].calls, expectedCallsState);
        assert.deepEqual(result.current[1], expectedChannelsWithCallsState);
        assert.deepEqual(result.current[2], expectedCurrentCallState);
        act(() => userLeftCall('server1', 'invalid-channel', 'session2'));
        assert.deepEqual(result.current[0].calls, expectedCallsState);
        assert.deepEqual(result.current[1], expectedChannelsWithCallsState);
        assert.deepEqual(result.current[2], expectedCurrentCallState);
    });

    it('leftCall with screensharing on', () => {
        const initialCallsState: CallsState = {
            ...DefaultCallsState,
            calls: {
                'channel-1': {
                    ...call1,
                    screenOn: 'session1',
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
            screenOn: 'session1',
        };
        const expectedCallsState = {
            'channel-1': {
                id: 'call1',
                sessions: {
                    session2: {sessionId: 'session2', userId: 'user-2', muted: true, raisedHand: 0},
                },
                channelId: 'channel-1',
                startTime: 123,
                threadId: 'thread-1',
                ownerId: 'user-1',
                hostId: 'user-1',
                screenOn: '',
                dismissed: {},
            },
        };
        const expectedChannelsWithCallsState = initialChannelsWithCallsState;
        const expectedCurrentCallState: CurrentCall = {
            ...initialCurrentCallState,
            ...expectedCallsState['channel-1'],
        };

        // setup
        const {result} = renderHook(() => {
            return [useCallsState('server1'), useChannelsWithCalls('server1'), useCurrentCall()] as const;
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
        act(() => userLeftCall('server1', 'channel-1', 'session1'));
        assert.deepEqual(result.current[0].calls, expectedCallsState);
        assert.deepEqual(result.current[1], expectedChannelsWithCallsState);
        assert.deepEqual(result.current[2], expectedCurrentCallState);
    });

    it('userLeftCall ends the native overlay when the last session leaves', () => {
        const {endNativeCall} = require('@calls/native_call');
        jest.clearAllMocks();

        const soloCall = {
            ...call1,
            sessions: {
                session1: {sessionId: 'session1', userId: 'user-1', muted: false, raisedHand: 0},
            },
        };
        act(() => {
            setCallsState('server1', {...DefaultCallsState, calls: {'channel-1': soloCall}});
            setChannelsWithCalls('server1', {'channel-1': true});
        });

        act(() => userLeftCall('server1', 'channel-1', 'session1'));

        expect(endNativeCall).toHaveBeenCalledWith('server1', 'channel-1', 'remoteEnded');
    });

    it('userLeftCall does not end the native overlay when other sessions remain', () => {
        const {endNativeCall} = require('@calls/native_call');
        jest.clearAllMocks();

        act(() => {
            setCallsState('server1', {...DefaultCallsState, calls: {'channel-1': call1}});
            setChannelsWithCalls('server1', {'channel-1': true});
        });

        act(() => userLeftCall('server1', 'channel-1', 'session1'));

        expect(endNativeCall).not.toHaveBeenCalled();
    });

    it('setCalls ends the native overlay for calls that disappeared from the server snapshot', async () => {
        const {endNativeCall} = require('@calls/native_call');
        jest.clearAllMocks();

        // Pre-existing state: two calls tracked locally.
        act(() => {
            setCallsState('server1', {...DefaultCallsState, calls: {'channel-1': call1, 'channel-2': call2}});
            setChannelsWithCalls('server1', {'channel-1': true, 'channel-2': true});
        });

        // Server now reports only channel-1; channel-2's call vanished while
        // we were disconnected (caller cancelled, or we missed call_end).
        await act(async () => setCalls('server1', 'myId', {'channel-1': call1}, {}));

        expect(endNativeCall).toHaveBeenCalledWith('server1', 'channel-2', 'remoteEnded');
        expect(endNativeCall).not.toHaveBeenCalledWith('server1', 'channel-1', expect.anything());
    });

    it('setCalls does not end the native overlay for calls still present', async () => {
        const {endNativeCall} = require('@calls/native_call');
        jest.clearAllMocks();

        act(() => {
            setCallsState('server1', {...DefaultCallsState, calls: {'channel-1': call1}});
            setChannelsWithCalls('server1', {'channel-1': true});
        });

        await act(async () => setCalls('server1', 'myId', {'channel-1': call1, 'channel-2': call2}, {}));

        expect(endNativeCall).not.toHaveBeenCalled();
    });

    it('callStarted', async () => {
        const initialCurrentCallState: CurrentCall = {
            ...DefaultCurrentCall,
            connected: false,
            serverUrl: 'server1',
            myUserId: 'myUserId',
            ...call1,
        };

        // setup
        await DatabaseManager.init(['server1']);

        const {result} = renderHook(() => {
            return [useCallsState('server1'), useChannelsWithCalls('server1'), useCurrentCall()] as const;
        });
        assert.deepEqual(result.current[0], DefaultCallsState);
        assert.deepEqual(result.current[1], {});
        assert.deepEqual(result.current[2], null);

        // test
        await act(async () => {
            setCurrentCall(initialCurrentCallState);
            await callStarted('server1', call1);
        });
        assert.deepEqual(result.current[0].calls, {'channel-1': call1});
        assert.deepEqual(result.current[1], {'channel-1': true});
        assert.deepEqual(result.current[2], initialCurrentCallState);
        expect(updateThreadFollowing).toHaveBeenCalled();
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
            return [useCallsState('server1'), useChannelsWithCalls('server1'), useCurrentCall()] as const;
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
        act(() => setUserMuted('server1', 'channel-1', 'session1', true));
        assert.deepEqual((result.current[0]).calls['channel-1'].sessions.session1.muted, true);
        assert.deepEqual((result.current[2])?.sessions.session1.muted, true);
        act(() => {
            setUserMuted('server1', 'channel-1', 'session1', false);
            setUserMuted('server1', 'channel-1', 'session2', false);
        });
        assert.deepEqual((result.current[0]).calls['channel-1'].sessions.session1.muted, false);
        assert.deepEqual((result.current[0]).calls['channel-1'].sessions.session2.muted, false);
        assert.deepEqual((result.current[2])?.sessions.session1.muted, false);
        assert.deepEqual((result.current[2])?.sessions.session2.muted, false);
        act(() => setUserMuted('server1', 'channel-1', 'session2', true));
        assert.deepEqual((result.current[0]).calls['channel-1'].sessions.session2.muted, true);
        assert.deepEqual((result.current[2])?.sessions.session2.muted, true);
        assert.deepEqual(result.current[0], initialCallsState);
        act(() => setUserMuted('server1', 'invalid-channel', 'session1', true));
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
            return [useCallsState('server1'), useChannelsWithCalls('server1'), useCurrentCall()] as const;
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
        act(() => setCallScreenOn('server1', 'channel-1', 'session1'));
        assert.deepEqual((result.current[0]).calls['channel-1'].screenOn, 'session1');
        assert.deepEqual(result.current[1], initialChannelsWithCallsState);
        assert.deepEqual((result.current[2])?.screenOn, 'session1');
        act(() => setCallScreenOff('server1', 'channel-1', 'session1'));
        assert.deepEqual(result.current[0], initialCallsState);
        assert.deepEqual(result.current[1], initialChannelsWithCallsState);
        assert.deepEqual(result.current[2], initialCurrentCallState);
        act(() => setCallScreenOn('server1', 'channel-1', 'invalid-user'));
        assert.deepEqual(result.current[0], initialCallsState);
        assert.deepEqual(result.current[1], initialChannelsWithCallsState);
        assert.deepEqual(result.current[2], initialCurrentCallState);
        act(() => setCallScreenOff('server1', 'invalid-channel', 'session1'));
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
                id: 'call1',
                sessions: {
                    session1: {sessionId: 'session1', userId: 'user-1', muted: false, raisedHand: 0},
                    session2: {sessionId: 'session2', userId: 'user-2', muted: true, raisedHand: 345},
                },
                channelId: 'channel-1',
                startTime: 123,
                screenOn: false,
                threadId: 'thread-1',
                ownerId: 'user-1',
                hostId: 'user-1',
                dismissed: {},
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
            return [useCallsState('server1'), useCurrentCall()] as const;
        });
        act(() => {
            setCallsState('server1', initialCallsState);
            setCurrentCall(initialCurrentCallState);
        });
        assert.deepEqual(result.current[0], initialCallsState);
        assert.deepEqual(result.current[1], initialCurrentCallState);

        // test
        act(() => setRaisedHand('server1', 'channel-1', 'session2', 345));
        assert.deepEqual((result.current[0]).calls, expectedCalls);
        assert.deepEqual((result.current[1]), expectedCurrentCallState);

        act(() => setRaisedHand('server1', 'invalid-channel', 'session1', 345));
        assert.deepEqual((result.current[0]).calls, expectedCalls);
        assert.deepEqual((result.current[1]), expectedCurrentCallState);

        // unraise hand:
        act(() => setRaisedHand('server1', 'channel-1', 'session2', 0));
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
            sessions: {
                ...call1.sessions,
                mySessionId: {sessionId: 'mySessionId', userId: 'myUserId', muted: true, raisedHand: 0},
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
            mySessionId: 'mySessionId',
            ...newCall1,
            dmCalleeAnsweredAt: ANSWERED_AT,
        };

        // setup
        const {result} = renderHook(() => {
            return [useCallsState('server1'), useCurrentCall()];
        });
        act(() => setCallsState('server1', initialCallsState));
        assert.deepEqual(result.current[0], initialCallsState);
        assert.deepEqual(result.current[1], null);

        // test
        act(() => atAnsweredTime(() => {
            newCurrentCall('server1', 'channel-1', 'myUserId');
            userJoinedCall('server1', 'channel-1', 'myUserId', 'mySessionId');
        }));
        assert.deepEqual(result.current[0], expectedCallsState);
        assert.deepEqual(result.current[1], expectedCurrentCallState);

        act(() => {
            myselfLeftCall();
            userLeftCall('server1', 'channel-1', 'mySessionId');
        });
        assert.deepEqual(result.current[0], initialCallsState);
        assert.deepEqual(result.current[1], null);
    });

    it('setChannelEnabled', async () => {
        const initialState = {
            ...DefaultCallsState,
            enabled: {'channel-1': true, 'channel-2': false},
        };

        // setup
        const {result} = renderHook(() => useCallsState('server1'));
        await act(async () => setCallsState('server1', initialState));
        assert.deepEqual(result.current, initialState);

        // test setCalls affects enabled:
        await act(async () => setCalls('server1', 'myUserId', {}, {'channel-1': true}));
        assert.deepEqual(result.current.enabled, {'channel-1': true});

        // re-setup:
        await act(async () => setCallsState('server1', initialState));
        assert.deepEqual(result.current, initialState);

        // test setChannelEnabled affects enabled:
        await act(async () => setChannelEnabled('server1', 'channel-3', true));
        assert.deepEqual(result.current.enabled, {'channel-1': true, 'channel-2': false, 'channel-3': true});
        await act(async () => setChannelEnabled('server1', 'channel-3', false));
        assert.deepEqual(result.current.enabled, {
            'channel-1': true,
            'channel-2': false,
            'channel-3': false,
        });
        await act(async () => setChannelEnabled('server1', 'channel-1', true));
        assert.deepEqual(result.current.enabled, {
            'channel-1': true,
            'channel-2': false,
            'channel-3': false,
        });
        await act(async () => setChannelEnabled('server1', 'channel-1', false));
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
            return [useCallsState('server1'), useCurrentCall()] as const;
        });
        act(() => setCallsState('server1', initialCallsState));
        assert.deepEqual(result.current[0], initialCallsState);
        assert.deepEqual(result.current[1], null);

        // test joining a call and setting url:
        act(() => newCurrentCall('server1', 'channel-1', 'myUserId'));
        act(() => userJoinedCall('server1', 'channel-1', 'myUserId', 'mySessionId'));
        assert.deepEqual((result.current[1])?.screenShareURL, '');
        act(() => setScreenShareURL('testUrl'));
        assert.deepEqual((result.current[1])?.screenShareURL, 'testUrl');

        act(() => {
            myselfLeftCall();
            userLeftCall('server1', 'channel-1', 'mySessionId');
            setScreenShareURL('test');
        });
        assert.deepEqual(result.current[0], initialCallsState);
        assert.deepEqual(result.current[1], null);
    });

    it('setAudioDeviceInfo', () => {
        const initialCallsState = {
            ...DefaultCallsState,
            myUserId: 'myUserId',
            calls: {'channel-1': call1, 'channel-2': call2},
        };
        const newCall1 = {
            ...call1,
            sessions: {
                ...call1.sessions,
                mySessionId: {sessionId: 'mySessionId', userId: 'myUserId', muted: true, raisedHand: 0},
            },
        };
        const expectedCallsState = {
            ...initialCallsState,
            calls: {
                ...initialCallsState.calls,
                'channel-1': newCall1,
            },
        };

        const defaultAudioDeviceInfo = {
            availableAudioDeviceList: [],
            selectedAudioDevice: AudioDevice.None,
        };
        const newAudioDeviceInfo = {
            availableAudioDeviceList: [AudioDevice.Speakerphone, AudioDevice.Earpiece],
            selectedAudioDevice: AudioDevice.Speakerphone,
        };

        // setup
        const {result} = renderHook(() => {
            return [useCallsState('server1'), useCurrentCall()] as const;
        });
        act(() => setCallsState('server1', initialCallsState));
        assert.deepEqual(result.current[0], initialCallsState);
        assert.deepEqual(result.current[1], null);

        // test
        act(() => newCurrentCall('server1', 'channel-1', 'myUserId'));
        act(() => userJoinedCall('server1', 'channel-1', 'myUserId', 'mySessionId'));
        assert.deepEqual((result.current[1])?.audioDeviceInfo, defaultAudioDeviceInfo);
        act(() => setAudioDeviceInfo(newAudioDeviceInfo));
        assert.deepEqual((result.current[1])?.audioDeviceInfo, newAudioDeviceInfo);
        assert.deepEqual(result.current[0], expectedCallsState);
        act(() => {
            myselfLeftCall();
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
            sessions: {
                ...call1.sessions,
                mySessionId: {sessionId: 'mySessionId', userId: 'myUserId', muted: true, raisedHand: 0},
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
            mySessionId: 'mySessionId',
            connected: true,
            ...newCall1,
            dmCalleeAnsweredAt: ANSWERED_AT,
        };
        const secondExpectedCurrentCallState: CurrentCall = {
            ...expectedCurrentCallState,
            micPermissionsErrorDismissed: true,
        };
        const expectedGlobalState: GlobalCallsState = {
            micPermissionsGranted: true,
            joiningChannelId: null,
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
        act(() => atAnsweredTime(() => {
            setMicPermissionsGranted(false);
            newCurrentCall('server1', 'channel-1', 'myUserId');
            userJoinedCall('server1', 'channel-1', 'myUserId', 'mySessionId');
        }));
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
            userLeftCall('server1', 'channel-1', 'mySessionId');

            // reset state to default
            setMicPermissionsGranted(false);
        });
        assert.deepEqual(result.current[0], initialCallsState);
        assert.deepEqual(result.current[1], null);
    });

    it('joining call', () => {
        const initialGlobalState = DefaultGlobalCallsState;
        const expectedGlobalState: GlobalCallsState = {
            ...DefaultGlobalCallsState,
            joiningChannelId: 'channel-1',
        };

        // setup
        const {result} = renderHook(() => {
            return [useGlobalCallsState()];
        });

        // start joining call
        act(() => setJoiningChannelId('channel-1'));
        assert.deepEqual(result.current[0], expectedGlobalState);

        // end joining call
        act(() => setJoiningChannelId(null));
        assert.deepEqual(result.current[0], initialGlobalState);
    });

    it('CallQuality', async () => {
        const initialCallsState: CallsState = {
            ...DefaultCallsState,
            myUserId: 'myUserId',
            calls: {'channel-1': call1, 'channel-2': call2},
        };
        const newCall1: Call = {
            ...call1,
            sessions: {
                ...call1.sessions,
                mySessionId: {sessionId: 'mySessionId', userId: 'myUserId', muted: true, raisedHand: 0},
            },
        };
        const expectedCallsState: CallsState = {
            ...initialCallsState,
            calls: {
                ...initialCallsState.calls,
                'channel-1': newCall1,
            },
        };
        const currentCallNoAlertNoDismissed: CurrentCall = {
            ...DefaultCurrentCall,
            serverUrl: 'server1',
            myUserId: 'myUserId',
            mySessionId: 'mySessionId',
            connected: true,
            ...newCall1,
            dmCalleeAnsweredAt: ANSWERED_AT,
        };

        // setup
        const {result} = renderHook(() => {
            return [useCallsState('server1'), useCurrentCall()] as const;
        });
        act(() => setCallsState('server1', initialCallsState));
        assert.deepEqual(result.current[0], initialCallsState);
        assert.deepEqual(result.current[1], null);

        // join call
        act(() => atAnsweredTime(() => {
            newCurrentCall('server1', 'channel-1', 'myUserId');
            userJoinedCall('server1', 'channel-1', 'myUserId', 'mySessionId');
        }));
        assert.deepEqual(result.current[0], expectedCallsState);
        assert.deepEqual(result.current[1], currentCallNoAlertNoDismissed);

        // call quality goes bad
        act(() => processMeanOpinionScore(3.4999));
        assert.deepEqual((result.current[1])?.callQualityAlert, true);
        assert.equal((result.current[1])?.callQualityAlertDismissed, 0);

        // call quality goes good
        act(() => processMeanOpinionScore(4));
        assert.deepEqual(result.current[1], currentCallNoAlertNoDismissed);

        // call quality goes bad
        act(() => processMeanOpinionScore(3.499));
        assert.deepEqual((result.current[1])?.callQualityAlert, true);
        assert.equal((result.current[1])?.callQualityAlertDismissed, 0);

        // dismiss call quality alert
        const timeNow = Date.now();
        act(() => setCallQualityAlertDismissed());
        assert.deepEqual((result.current[1])?.callQualityAlert, false);
        assert.equal((result.current[1]!).callQualityAlertDismissed >= timeNow &&
            (result.current[1]!).callQualityAlertDismissed <= Date.now(), true);

        // call quality goes bad, but we're not past the dismissed limit
        act(() => processMeanOpinionScore(3.4999));
        assert.deepEqual((result.current[1])?.callQualityAlert, false);

        // test that the dismiss expired
        await act(async () => {
            await new Promise((r) => setTimeout(r, 101));
            processMeanOpinionScore(3.499);
        });
        assert.deepEqual((result.current[1])?.callQualityAlert, true);
    });

    it('voiceOn and Off', async () => {
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
        act(() => setUserVoiceOn('channel-1', 'session1', true));
        assert.deepEqual(result.current[1], {...initialCurrentCallState, voiceOn: {session1: true}});
        assert.deepEqual(result.current[0], initialCallsState);
        act(() => setUserVoiceOn('channel-1', 'session2', true));
        assert.deepEqual(result.current[1], {...initialCurrentCallState, voiceOn: {session1: true, session2: true}});
        assert.deepEqual(result.current[0], initialCallsState);
        act(() => setUserVoiceOn('channel-1', 'session1', false));
        assert.deepEqual(result.current[1], {...initialCurrentCallState, voiceOn: {session2: true}});
        assert.deepEqual(result.current[0], initialCallsState);

        // test that voice state is cleared on reconnect
        await act(() => setCalls('server1', 'myUserId', initialCallsState.calls, {}));
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
        // userReacted schedules a REACTION_TIMEOUT cleanup per reaction.
        enableFakeTimers();

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
            sessions: {
                ...initialCurrentCallState.sessions,
                session1: {
                    ...initialCurrentCallState.sessions.session1,
                    reaction: {
                        user_id: 'user-1',
                        session_id: 'session1',
                        emoji: {name: 'smile', unified: 'something'},
                        timestamp: 202,
                    },
                },
                session2: {
                    ...initialCurrentCallState.sessions.session2,
                    reaction: {
                        user_id: 'user-2',
                        session_id: 'session2',
                        emoji: {name: '+1', unified: 'something'},
                        timestamp: 145,
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
                session_id: 'session2',
                emoji: {name: '+1', unified: 'something'},
                timestamp: 123,
            });
            userReacted('server1', 'channel-1', {
                user_id: 'user-2',
                session_id: 'session2',
                emoji: {name: '+1', unified: 'something'},
                timestamp: 145,
            });
            userReacted('server1', 'channel-1', {
                user_id: 'user-1',
                session_id: 'session1',
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
        const recState: CallJobState = {
            type: Calls.JOB_TYPE_RECORDING,
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
            return [useCallsState('server1'), useCurrentCall()] as const;
        });
        act(() => {
            setCallsState('server1', initialCallsState);
            setCurrentCall(initialCurrentCallState);
        });
        assert.deepEqual(result.current[0], initialCallsState);
        assert.deepEqual(result.current[1], initialCurrentCallState);

        // test
        act(() => setRecordingState('server1', 'channel-1', recState));
        assert.deepEqual((result.current[0]), expectedCallsState);
        assert.deepEqual((result.current[1]), expectedCurrentCallState);
        act(() => setRecordingState('server1', 'channel-2', recState));
        assert.deepEqual((result.current[0]).calls['channel-2'], {...call2, recState});
        assert.deepEqual((result.current[1]), expectedCurrentCallState);
        act(() => setRecordingState('server1', 'channel-1', {...recState, start_at: recState.start_at + 1}));
        expect(needsRecordingAlert).toHaveBeenCalled();
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
            return [useCallsState('server1'), useCurrentCall()] as const;
        });
        act(() => {
            setCallsState('server1', initialCallsState);
            setCurrentCall(initialCurrentCallState);
        });
        assert.deepEqual(result.current[0], initialCallsState);
        assert.deepEqual(result.current[1], initialCurrentCallState);

        // test
        act(() => setHost('server1', 'channel-1', 'user-52'));
        assert.deepEqual((result.current[0]), expectedCallsState);
        assert.deepEqual((result.current[1]), expectedCurrentCallState);
        act(() => setHost('server1', 'channel-2', 'user-1923'));
        assert.deepEqual((result.current[0]).calls['channel-2'], {...call2, hostId: 'user-1923'});
        assert.deepEqual((result.current[1]), expectedCurrentCallState);
        act(() => setHost('server1', 'channel-1', 'myUserId'));
        expect(needsRecordingAlert).toHaveBeenCalled();
    });

    it('incoming calls', async () => {
        const calls = {'channel-dm': callDM};
        const afterLoadCallsState: CallsState = {
            myUserId: 'myId',
            calls,
            enabled: {},
        };
        const initialCurrentCallState: CurrentCall | null = null;
        const initialIncomingCalls = DefaultIncomingCalls;
        const expectedIncomingCalls: IncomingCalls = {
            ...DefaultIncomingCalls,
            incomingCalls: [{
                callID: 'callDM',
                callerID: 'user-5',
                callerModel: user5,
                channelID: 'channel-private',
                myUserId: 'myId',
                serverUrl: 'server1',
                startAt: 123,
                type: 0,
            }],
        };
        const dismissedCalls = {
            'channel-dm': {...callDM, dismissed: {myId: true}},
        };
        const callIStarted: Call = {
            id: 'callIStartedid',
            sessions: {
                session5: {sessionId: 'session5', userId: 'user-5', muted: false, raisedHand: 0},
            },
            channelId: 'channel-private2',
            startTime: 123,
            screenOn: '',
            threadId: 'thread-4',
            ownerId: 'myId',
            hostId: 'user-5',
            dismissed: {},
        };
        const callImIn: Call = {
            id: 'callImInId',
            sessions: {},
            channelId: 'channel-private2',
            startTime: 123,
            screenOn: '',
            threadId: 'thread-4',
            ownerId: 'user-5',
            hostId: 'user-5',
            dismissed: {},
        };
        const currentCallStateImIn: CurrentCall = {
            ...DefaultCurrentCall,
            serverUrl: 'server1',
            myUserId: 'myId',
            ...callImIn,
        };

        // setup
        await DatabaseManager.init(['server1']);
        const {result} = renderHook(() => {
            return [
                useCallsState('server1'),
                useCurrentCall(),
                useIncomingCalls(),
            ];
        });
        act(() => {
            setCallsConfig('server1', {...DefaultCallsConfig, EnableRinging: true});
        });
        assert.deepEqual(result.current[0], DefaultCallsState);
        assert.deepEqual(result.current[1], initialCurrentCallState);
        assert.deepEqual(result.current[2], initialIncomingCalls);

        // test incoming call on load
        await act(async () => setCalls('server1', 'myId', afterLoadCallsState.calls, {}));
        assert.deepEqual(result.current[0], afterLoadCallsState);
        assert.deepEqual(result.current[1], initialCurrentCallState);
        assert.deepEqual(result.current[2], expectedIncomingCalls);

        // test dismissing (same path for manually dismissing, joining that call,
        // or receiving ws event from dismissing/joining from another client)
        act(() => removeIncomingCall('server1', 'callDM'));
        assert.deepEqual(result.current[0], afterLoadCallsState);
        assert.deepEqual(result.current[1], initialCurrentCallState);
        assert.deepEqual(result.current[2], DefaultIncomingCalls);

        // test load call, but call has been dismissed
        await act(async () => setCalls('server1', 'myId', dismissedCalls, {}));
        assert.deepEqual(result.current[2], DefaultIncomingCalls);

        // test load call, then load same call again (eg from ws event): should only have one notification
        await act(async () => setCalls('server1', 'myId', afterLoadCallsState.calls, {}));
        assert.deepEqual(result.current[2], expectedIncomingCalls);
        await act(async () => processIncomingCalls('server1', [calls['channel-dm']]));
        assert.deepEqual(result.current[2], expectedIncomingCalls);

        // test received ws event for a call I started
        await act(async () => processIncomingCalls('server1', [callIStarted]));
        assert.deepEqual(result.current[2], expectedIncomingCalls);

        // test received ws event for a call I am in
        await act(async () => {
            setCurrentCall(currentCallStateImIn);
            await processIncomingCalls('server1', [callImIn]);
        });
        assert.deepEqual(result.current[1], currentCallStateImIn);
        assert.deepEqual(result.current[2], expectedIncomingCalls);
    });

    // TODO: Flaky test - disabled until root cause is identified
    // See https://mattermost.atlassian.net/browse/MM-67173
    it('should not ring on iOS (CallKit handles it)', async () => {
        const initialIncomingCalls = {
            ...DefaultIncomingCalls,
            incomingCalls: [{
                callID: 'call1',
                callerID: 'user-5',
                callerModel: TestHelper.fakeUserModel({username: 'user-5'}),
                channelID: 'channel-dm',
                myUserId: 'myId',
                serverUrl: 'server1',
                startAt: 123,
                type: 0,
            }],
        };

        await DatabaseManager.init(['server1']);
        const {result} = renderHook(() => useIncomingCalls());
        await act(async () => {
            setIncomingCalls(initialIncomingCalls);
        });
        AppState.currentState = 'active';

        // Platform.OS defaults to 'ios' in the test environment
        await act(async () => {
            await playIncomingCallsRinging('server1', 'call1', 'online');
        });

        expect(CallsNative.startRingtone).not.toHaveBeenCalled();
        assert.deepEqual(result.current, initialIncomingCalls);
    });

    it('should ring on Android with correct guards and expire after RING_LENGTH', async () => {
        enableFakeTimers();
        const originalOS = Platform.OS;
        Platform.OS = 'android';

        try {
            const initialIncomingCalls = {
                ...DefaultIncomingCalls,
                incomingCalls: [{
                    callID: 'call1',
                    callerID: 'user-5',
                    callerModel: TestHelper.fakeUserModel({username: 'user-5'}),
                    channelID: 'channel-dm',
                    myUserId: 'myId',
                    serverUrl: 'server1',
                    startAt: 123,
                    type: 0,
                }],
            };

            await DatabaseManager.init(['server1']);
            const {result} = renderHook(() => useIncomingCalls());
            await act(async () => {
                setIncomingCalls(initialIncomingCalls);
            });
            AppState.currentState = 'active';

            jest.mocked(getCurrentUser).mockResolvedValue({
                id: 'user-5',
                roles: 'user',
                notifyProps: {
                    calls_mobile_sound: 'true',
                    calls_mobile_notification_sound: 'Calm',
                },
            } as never);

            // should not ring when in DND
            await act(async () => {
                await playIncomingCallsRinging('server1', 'call1', 'dnd');
            });
            expect(CallsNative.startRingtone).not.toHaveBeenCalled();
            assert.deepEqual(result.current, initialIncomingCalls);

            // should not ring when OOO
            await act(async () => {
                await playIncomingCallsRinging('server1', 'call1', 'ooo');
            });
            expect(CallsNative.startRingtone).not.toHaveBeenCalled();

            // should ring when online
            await act(async () => {
                await playIncomingCallsRinging('server1', 'call1', 'online');
            });
            expect(CallsNative.startRingtone).toHaveBeenCalledWith('calls_calm', Calls.RING_LENGTH / 1000, false);
            assert.deepEqual(result.current, {
                ...initialIncomingCalls,
                currentRingingCallId: 'call1',
                callIdHasRung: {call1: true},
            });

            // should stop ringing and clear currentRingingCallId after RING_LENGTH
            await act(async () => {
                await advanceTimers(Calls.RING_LENGTH);
            });
            expect(CallsNative.stopRingtone).toHaveBeenCalled();
            assert.deepEqual(result.current.currentRingingCallId, undefined);

            // should not ring for the same call again (callIdHasRung blocks it)
            await act(async () => {
                setIncomingCalls({
                    ...initialIncomingCalls,
                    callIdHasRung: {call1: true},
                });
                await playIncomingCallsRinging('server1', 'call1', 'online');
            });
            expect(CallsNative.startRingtone).toHaveBeenCalledTimes(1);

            // should not ring when already ringing for a different call
            await act(async () => {
                setIncomingCalls({...initialIncomingCalls, currentRingingCallId: 'call2'});
                await playIncomingCallsRinging('server1', 'call1', 'online');
            });
            assert.deepEqual(result.current.currentRingingCallId, 'call2');
        } finally {
            Platform.OS = originalOS;
            disableFakeTimers();
        }
    });

    it('callsOnAppStateChange', async () => {
        const initialIncomingCalls = {
            ...DefaultIncomingCalls,
            currentRingingCallId: 'call1',
        };

        // setup
        const {result} = renderHook(() => useIncomingCalls());
        act(() => {
            setIncomingCalls(initialIncomingCalls);
        });
        assert.deepEqual(result.current, initialIncomingCalls);

        // test going to background
        await act(async () => {
            await callsOnAppStateChange('background');
        });
        assert.deepEqual(result.current, {...initialIncomingCalls, currentRingingCallId: undefined});

        // test going to inactive
        await act(async () => {
            setIncomingCalls(initialIncomingCalls);
            await callsOnAppStateChange('inactive');
            await TestHelper.wait(100);
        });
        assert.deepEqual(result.current, {...initialIncomingCalls, currentRingingCallId: undefined});

        // test going to active (should not change state)
        await act(async () => {
            setIncomingCalls(initialIncomingCalls);
            await callsOnAppStateChange('active');
            await TestHelper.wait(100);
        });
        assert.deepEqual(result.current, initialIncomingCalls);

        // test previous state
        await act(async () => {
            setIncomingCalls(initialIncomingCalls);
            await callsOnAppStateChange('active');
            await TestHelper.wait(100);
        });
        assert.deepEqual(result.current, initialIncomingCalls);
    });

    it('setCallForChannel', async () => {
        const initialCallsState = {
            ...DefaultCallsState,
            calls: {'channel-1': call1},
            enabled: {'channel-1': true},
        };
        const initialChannelsWithCalls = {'channel-1': true};
        const initialCurrentCallState: CurrentCall = {
            ...DefaultCurrentCall,
            serverUrl: 'server1',
            myUserId: 'myUserId',
            ...call1,
        };

        // setup
        const {result} = renderHook(() => {
            return [useCallsState('server1'), useChannelsWithCalls('server1'), useCurrentCall()] as const;
        });
        await act(async () => {
            await setCallsState('server1', initialCallsState);
            await setChannelsWithCalls('server1', initialChannelsWithCalls);
            await setCurrentCall(initialCurrentCallState);
        });
        assert.deepEqual(result.current[0], initialCallsState);
        assert.deepEqual(result.current[1], initialChannelsWithCalls);
        assert.deepEqual(result.current[2], initialCurrentCallState);

        // test: add new call
        await act(async () => setCallForChannel('server1', 'channel-2', call2, true));
        assert.deepEqual(result.current[0], {
            ...initialCallsState,
            calls: {...initialCallsState.calls, 'channel-2': call2},
            enabled: {...initialCallsState.enabled, 'channel-2': true},
        });
        assert.deepEqual(result.current[1], {...initialChannelsWithCalls, 'channel-2': true});

        // test: update existing call
        const updatedCall1 = {...call1, screenOn: 'newScreen'};
        await act(async () => setCallForChannel('server1', 'channel-1', updatedCall1));
        assert.deepEqual(result.current[0].calls['channel-1'], updatedCall1);
        assert.deepEqual(result.current[2], {...initialCurrentCallState, screenOn: 'newScreen'});

        // test: remove call
        await act(async () => setCallForChannel('server1', 'channel-1', undefined));
        assert.deepEqual(result.current[0], {
            ...initialCallsState,
            calls: {'channel-2': call2},
            enabled: {'channel-1': true, 'channel-2': true},
        });
        assert.deepEqual(result.current[1], {'channel-2': true});

        // test: just update enabled state
        await act(async () => setCallForChannel('server1', 'channel-3', undefined, true));
        assert.deepEqual(result.current[0].enabled['channel-3'], true);
        assert.deepEqual(result.current[1], {'channel-2': true});
    });

    it('setCurrentCallConnected', () => {
        const initialCurrentCallState: CurrentCall = {
            ...DefaultCurrentCall,
            serverUrl: 'server1',
            myUserId: 'myUserId',
            connected: false,
            mySessionId: '',
            ...call1,
        };

        // setup
        const {result} = renderHook(() => useCurrentCall());
        act(() => {
            setCurrentCall(initialCurrentCallState);
        });
        assert.deepEqual(result.current, initialCurrentCallState);

        // test
        act(() => setCurrentCallConnected('channel-1', 'session-test-id'));
        assert.deepEqual(result.current, {
            ...initialCurrentCallState,
            connected: true,
            mySessionId: 'session-test-id',
        });

        // test with wrong channel ID (should not change state)
        act(() => {
            setCurrentCall(initialCurrentCallState);
            setCurrentCallConnected('wrong-channel', 'session-test-id');
        });
        assert.deepEqual(result.current, initialCurrentCallState);
    });

    it('captions', () => {
        // receivedCaption schedules a CAPTION_TIMEOUT cleanup per caption.
        enableFakeTimers();

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
        const caption1user1Data: LiveCaptionData = {
            session_id: 'session1',
            user_id: 'user-1',
            channel_id: 'channel-1',
            text: 'caption 1',
        };
        const caption2user1Data: LiveCaptionData = {
            session_id: 'session1',
            user_id: 'user-1',
            channel_id: 'channel-1',
            text: 'caption 2',
        };
        const caption3user1Data: LiveCaptionData = {
            session_id: 'session1',
            user_id: 'user-1',
            channel_id: 'channel-1',
            text: 'caption 3',
        };
        const caption1user2Data: LiveCaptionData = {
            session_id: 'session2',
            user_id: 'user-2',
            channel_id: 'channel-1',
            text: 'caption 1 user 2',
        };
        const caption2user2Data: LiveCaptionData = {
            session_id: 'session2',
            user_id: 'user-2',
            channel_id: 'channel-1',
            text: 'caption 2 user 2',
        };

        // setup
        const {result} = renderHook(() => {
            return [useCallsState('server1'), useCurrentCall()] as const;
        });
        act(() => {
            setCallsState('server1', initialCallsState);
            setCurrentCall(initialCurrentCallState);
        });
        assert.deepEqual(result.current[0], initialCallsState);
        assert.deepEqual(result.current[1], initialCurrentCallState);

        // test sending the first 2 captions for user 1, 1 caption for user 2
        act(() => {
            receivedCaption('server1', caption1user1Data);
            receivedCaption('server1', caption2user1Data);
            receivedCaption('server1', caption1user2Data);
        });
        assert.deepEqual(result.current[0], initialCallsState);
        let currentCall = result.current[1];
        assert.equal(currentCall?.captions.session1.text, 'caption 2');
        assert.equal(currentCall?.captions.session2.text, 'caption 1 user 2');

        // test sending the next captions for users 1 and 2
        act(() => {
            receivedCaption('server1', caption3user1Data);
            receivedCaption('server1', caption2user2Data);
        });
        assert.deepEqual(result.current[0], initialCallsState);
        currentCall = result.current[1];
        assert.equal(currentCall?.captions.session1.text, 'caption 3');
        assert.equal(currentCall?.captions.session2.text, 'caption 2 user 2');
    });

    describe('ringback', () => {
        // A 1:1 DM between myUserId and other-user, per the userId1__userId2 channel name convention.
        const dmChannel = {type: 'D', name: 'myUserId__other-user'};

        let callIOwn: Call;

        // startRingbackIfNeeded awaits the channel and the current user before it starts the tone,
        // so give the microtask queue a couple of rounds to drain.
        const settle = async () => {
            await act(async () => {
                await advanceTimers(0);
                await advanceTimers(0);
            });
        };

        const connect = async () => {
            act(() => setCurrentCallConnected('channel-ringback', 'mySession'));
            await settle();
        };

        beforeEach(async () => {
            enableFakeTimers();
            jest.mocked(getChannelById).mockResolvedValue(dmChannel as never);
            await DatabaseManager.init(['server1']);

            callIOwn = {
                id: 'call-ringback',
                sessions: {
                    mySession: {sessionId: 'mySession', userId: 'myUserId', muted: false, raisedHand: 0},
                },
                channelId: 'channel-ringback',
                startTime: Date.now(),
                screenOn: '',
                threadId: 'thread-ringback',
                ownerId: 'myUserId',
                hostId: 'myUserId',
                dismissed: {},
            };

            setCallsConfig('server1', {...DefaultCallsConfig, EnableRinging: true});
            setCallsState('server1', {...DefaultCallsState, calls: {'channel-ringback': callIOwn}});

            // Earlier tests leave a ringing incoming call behind in the store, which would make
            // the backgrounding path stop that ringtone too.
            setIncomingCalls(DefaultIncomingCalls);
            newCurrentCall('server1', 'channel-ringback', 'myUserId');
        });

        afterEach(() => {
            stopRingback();
            disableFakeTimers();
            jest.mocked(getChannelById).mockReset();
            jest.mocked(getCurrentUser).mockReset();
        });

        it('starts ringback when the owner connects on a DM call, and never resumes once another participant joins', async () => {
            await connect();
            expect(CallsNative.startRingtone).toHaveBeenCalledWith('ringback', 0, true);
            expect(CallsNative.stopRingtone).not.toHaveBeenCalled();

            // another participant joins - ringback should stop immediately
            act(() => userJoinedCall('server1', 'channel-ringback', 'other-user', 'their-session'));
            expect(CallsNative.stopRingtone).toHaveBeenCalledTimes(1);

            // a duplicate/late "connected" event for the same call must not restart it
            await connect();
            expect(CallsNative.startRingtone).toHaveBeenCalledTimes(1);

            // even after the other participant leaves, ringback must not resume
            act(() => userLeftCall('server1', 'channel-ringback', 'their-session'));
            expect(CallsNative.startRingtone).toHaveBeenCalledTimes(1);
        });

        it('starts ringback for the call initiator, whose ownerId is only filled in by callStarted', async () => {
            // Starting a call: there's no call in callsState yet, so newCurrentCall seeds
            // currentCall from DefaultCall and ownerId is ''.
            setCallsState('server1', {...DefaultCallsState, calls: {}});
            act(() => newCurrentCall('server1', 'channel-ringback', 'myUserId'));

            await connect();
            expect(CallsNative.startRingtone).not.toHaveBeenCalled();

            // The call_start event brings the authoritative call, ownerId included.
            await act(async () => {
                await callStarted('server1', callIOwn);
            });
            await settle();
            expect(CallsNative.startRingtone).toHaveBeenCalledWith('ringback', 0, true);
        });

        it('does not ring back for a call the current user does not own', async () => {
            setCallsState('server1', {...DefaultCallsState, calls: {'channel-ringback': {...callIOwn, ownerId: 'someone-else'}}});
            newCurrentCall('server1', 'channel-ringback', 'myUserId');

            await connect();
            expect(CallsNative.startRingtone).not.toHaveBeenCalled();
        });

        it('does not ring back outside 1:1 DM channels', async () => {
            jest.mocked(getChannelById).mockResolvedValue({type: 'G', name: 'group-channel'} as never);

            await connect();
            expect(CallsNative.startRingtone).not.toHaveBeenCalled();
        });

        it('does not ring back in a DM with yourself, which nobody can answer', async () => {
            jest.mocked(getChannelById).mockResolvedValue({type: 'D', name: 'myUserId__myUserId'} as never);

            await connect();
            expect(CallsNative.startRingtone).not.toHaveBeenCalled();
        });

        it('does not ring back when ringing is disabled server-side', async () => {
            setCallsConfig('server1', {...DefaultCallsConfig, EnableRinging: false});

            await connect();
            expect(CallsNative.startRingtone).not.toHaveBeenCalled();
        });

        it('rings back regardless of the incoming-call notification sound setting', async () => {
            // That setting governs the tone for calls arriving at this device. The ringback is
            // feedback for a call the user just placed, and most accounts have never set the prop
            // at all, which would otherwise read as "off".
            jest.mocked(getCurrentUser).mockResolvedValue({notifyProps: {calls_mobile_sound: 'false'}} as never);

            await connect();
            expect(CallsNative.startRingtone).toHaveBeenCalledWith('ringback', 0, true);
        });

        it('stops automatically when the call reaches the ringback timeout', async () => {
            // Half the ring window has already elapsed by the time the media connection is up,
            // so the tone should stop after the remainder, not a full timeout later.
            const halfway = Calls.RINGBACK_TONE_TIMEOUT / 2;
            jest.advanceTimersByTime(halfway);

            await connect();
            expect(CallsNative.startRingtone).toHaveBeenCalledWith('ringback', 0, true);

            await act(async () => {
                await advanceTimers(halfway - 1);
            });
            expect(CallsNative.stopRingtone).not.toHaveBeenCalled();

            await act(async () => {
                await advanceTimers(1);
            });
            expect(CallsNative.stopRingtone).toHaveBeenCalledTimes(1);
        });

        it('rings for the full window when the device clock runs ahead of the server clock', async () => {
            // startTime is the server's start_at. Measuring the window against it meant a device an
            // hour ahead of the server saw the window as long gone and killed the tone immediately.
            const skewed = {...callIOwn, startTime: Date.now() - (60 * 60 * 1000)};
            setCallsState('server1', {...DefaultCallsState, calls: {'channel-ringback': skewed}});
            newCurrentCall('server1', 'channel-ringback', 'myUserId');

            await connect();
            expect(CallsNative.startRingtone).toHaveBeenCalledWith('ringback', 0, true);

            await act(async () => {
                await advanceTimers(Calls.RINGBACK_TONE_TIMEOUT - 1);
            });
            expect(CallsNative.stopRingtone).not.toHaveBeenCalled();

            await act(async () => {
                await advanceTimers(1);
            });
            expect(CallsNative.stopRingtone).toHaveBeenCalledTimes(1);
        });

        it('stops ringback when the caller leaves the call', async () => {
            await connect();
            expect(CallsNative.startRingtone).toHaveBeenCalledWith('ringback', 0, true);

            await act(async () => {
                await myselfLeftCall();
            });
            expect(CallsNative.stopRingtone).toHaveBeenCalledTimes(1);
        });

        it('stops ringback when a reconnect snapshot already contains the answering user', async () => {
            await connect();
            expect(CallsNative.startRingtone).toHaveBeenCalledTimes(1);

            // We missed the user_joined event while the websocket was down; the snapshot has it.
            const answered = {
                ...callIOwn,
                sessions: {
                    ...callIOwn.sessions,
                    theirSession: {sessionId: 'theirSession', userId: 'other-user', muted: false, raisedHand: 0},
                },
            };
            await act(async () => {
                await setCalls('server1', 'myUserId', {'channel-ringback': answered}, {});
            });
            expect(CallsNative.stopRingtone).toHaveBeenCalledTimes(1);
        });

        it('keeps ringing back while the app is backgrounded, and still expires on the ringback timeout', async () => {
            await connect();
            expect(CallsNative.startRingtone).toHaveBeenCalledTimes(1);

            await act(async () => {
                await callsOnAppStateChange('background');
            });

            // The caller is still in the call, so the tone plays on rather than leaving them in
            // silence with no cue that the callee picked up.
            expect(CallsNative.stopRingtone).not.toHaveBeenCalled();

            await act(async () => {
                await advanceTimers(Calls.RINGBACK_TONE_TIMEOUT);
            });
            expect(CallsNative.stopRingtone).toHaveBeenCalledTimes(1);
        });

        it('does not vibrate the caller, unlike the incoming ring', async () => {
            await connect();

            expect(CallsNative.startRingtone).toHaveBeenCalledWith('ringback', 0, true);
        });

        it('does not restart ringback for a call already answered, but does for a later fresh call', async () => {
            await connect();
            act(() => userJoinedCall('server1', 'channel-ringback', 'other-user', 'their-session'));
            expect(CallsNative.startRingtone).toHaveBeenCalledTimes(1);
            expect(CallsNative.stopRingtone).toHaveBeenCalledTimes(1);

            // a brand new call in the same channel should be able to ring back again
            setCallsState('server1', {...DefaultCallsState, calls: {'channel-ringback': callIOwn}});
            act(() => newCurrentCall('server1', 'channel-ringback', 'myUserId'));
            await connect();
            expect(CallsNative.startRingtone).toHaveBeenCalledTimes(2);
        });
    });

    describe('outgoing call', () => {
        beforeEach(() => {
            setCurrentCall(null);
            setCallsState('server1', {...DefaultCallsState, myUserId: 'myUserId'});
        });

        it('should seed a current call marked as started by me, so the call view has something to show', () => {
            const {result} = renderHook(() => useCurrentCall());

            act(() => startOutgoingCall('server1', 'channel-1'));

            assert.deepEqual(result.current, {
                ...DefaultCurrentCall,
                serverUrl: 'server1',
                channelId: 'channel-1',
                myUserId: 'myUserId',
                startedByMe: true,

                // A call we place is ours to host and is live from the start, both of which the
                // server confirms moments later with the same answer.
                hostId: 'myUserId',
                startUnmuted: true,
            });
        });

        it('should not claim to host a call the channel already has', () => {
            setCallsState('server1', {...DefaultCallsState, myUserId: 'myUserId', calls: {'channel-1': call1}});
            const {result} = renderHook(() => useCurrentCall());

            act(() => startOutgoingCall('server1', 'channel-1'));

            assert.equal(result.current?.hostId, call1.hostId);
        });

        it('should show my own session unmuted from the start on a call I place live', () => {
            setCallsState('server1', {
                ...DefaultCallsState,
                myUserId: 'myUserId',
                calls: {'channel-1': {...DefaultCall, id: 'call1', channelId: 'channel-1'}},
            });
            const {result} = renderHook(() => [useCurrentCall(), useCallsState('server1')] as const);

            act(() => startOutgoingCall('server1', 'channel-1'));
            act(() => userJoinedCall('server1', 'channel-1', 'myUserId', 'mySessionId'));

            // Our unmute is already on its way, so we don't flash as muted for the round trip.
            assert.equal(result.current[0]?.sessions.mySessionId.muted, false);

            // The server's own view of the call is untouched: everyone joins it muted.
            assert.equal(result.current[1].calls['channel-1'].sessions.mySessionId.muted, true);
        });

        it('should keep my own session unmuted through the snapshots that still have me muted', async () => {
            const call = {...DefaultCall, id: 'call1', channelId: 'channel-1'};
            setCallsState('server1', {...DefaultCallsState, myUserId: 'myUserId', calls: {'channel-1': call}});
            const {result} = renderHook(() => useCurrentCall());

            act(() => startOutgoingCall('server1', 'channel-1'));
            act(() => userJoinedCall('server1', 'channel-1', 'myUserId', 'mySessionId'));

            // call_start carries no sessions at all, so it must not drop the one we just added.
            await act(async () => callStarted('server1', {...call, ownerId: 'myUserId', hostId: 'myUserId'}));
            assert.equal(result.current?.sessions.mySessionId?.muted, false);

            // A full call-state snapshot does carry sessions, with us muted as everyone joins.
            const mutedSnapshot = {
                ...call,
                sessions: {mySessionId: {sessionId: 'mySessionId', userId: 'myUserId', muted: true, raisedHand: 0}},
            };
            act(() => setCallForChannel('server1', 'channel-1', mutedSnapshot));
            assert.equal(result.current?.sessions.mySessionId.muted, false);

            await act(async () => setCalls('server1', 'myUserId', {'channel-1': mutedSnapshot}, {}));
            assert.equal(result.current?.sessions.mySessionId.muted, false);
        });

        it('should not let a session-less call_start empty the call it reports on', async () => {
            const call = {...DefaultCall, id: 'call1', channelId: 'channel-1'};
            setCallsState('server1', {...DefaultCallsState, myUserId: 'myUserId', calls: {'channel-1': call}});
            const {result} = renderHook(() => [useCurrentCall(), useCallsState('server1')] as const);

            act(() => startOutgoingCall('server1', 'channel-1'));
            act(() => userJoinedCall('server1', 'channel-1', 'myUserId', 'mySessionId'));

            // The event carries no sessions, so it has nothing to say about who is in the call.
            await act(async () => callStarted('server1', {...call, ownerId: 'myUserId', hostId: 'myUserId'}));

            assert.deepEqual(Object.keys(result.current[0]?.sessions ?? {}), ['mySessionId']);
            assert.deepEqual(Object.keys(result.current[1].calls['channel-1'].sessions), ['mySessionId']);
        });

        it('should stop showing myself live when the unmute never left the device', () => {
            setCallsState('server1', {...DefaultCallsState, myUserId: 'myUserId'});
            const {result} = renderHook(() => useCurrentCall());

            act(() => startOutgoingCall('server1', 'channel-1'));
            assert.equal(result.current?.startUnmuted, true);

            act(() => clearStartUnmuted());

            assert.equal(result.current?.startUnmuted, false);
        });

        it('should stop standing in for my mute state once the server reports it', async () => {
            const call = {...DefaultCall, id: 'call1', channelId: 'channel-1'};
            setCallsState('server1', {...DefaultCallsState, myUserId: 'myUserId', calls: {'channel-1': call}});
            const {result} = renderHook(() => useCurrentCall());

            act(() => startOutgoingCall('server1', 'channel-1'));
            act(() => userJoinedCall('server1', 'channel-1', 'myUserId', 'mySessionId'));

            // Our unmute came back, so from here on the server has the last word - including when
            // it mutes us again, whether we asked for it or the host did.
            act(() => setUserMuted('server1', 'channel-1', 'mySessionId', false));
            assert.equal(result.current?.startUnmuted, false);

            act(() => setUserMuted('server1', 'channel-1', 'mySessionId', true));
            assert.equal(result.current?.sessions.mySessionId.muted, true);
        });

        it('should show my own session muted when joining a call I am not going live on', () => {
            setCallsState('server1', {
                ...DefaultCallsState,
                myUserId: 'myUserId',
                calls: {'channel-1': {...DefaultCall, id: 'call1', channelId: 'channel-1'}},
            });
            const {result} = renderHook(() => useCurrentCall());

            act(() => newCurrentCall('server1', 'channel-1', 'myUserId'));
            act(() => userJoinedCall('server1', 'channel-1', 'myUserId', 'mySessionId'));

            assert.equal(result.current?.sessions.mySessionId.muted, true);
        });

        it('should not seed a current call when my user is unknown, since the callee cannot be resolved', () => {
            setCallsState('server1', DefaultCallsState);
            const {result} = renderHook(() => useCurrentCall());

            act(() => startOutgoingCall('server1', 'channel-1'));

            assert.deepEqual(result.current, null);
        });

        it('should cancel an outgoing call that never connected', async () => {
            const {result} = renderHook(() => useCurrentCall());
            act(() => startOutgoingCall('server1', 'channel-1'));

            await act(async () => cancelOutgoingCall('server1', 'channel-1'));

            assert.deepEqual(result.current, null);
        });

        it('should leave a call in another channel, or one already connected, alone', async () => {
            const {result} = renderHook(() => useCurrentCall());
            act(() => startOutgoingCall('server1', 'channel-1'));

            await act(async () => cancelOutgoingCall('server1', 'channel-2'));
            assert.notEqual(result.current, null);

            act(() => setCurrentCall({...result.current!, connected: true}));
            await act(async () => cancelOutgoingCall('server1', 'channel-1'));
            assert.notEqual(result.current, null);
        });
    });
});
