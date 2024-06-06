// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'assert';

import {act, renderHook} from '@testing-library/react-hooks'; // Use instead of react-native version due to different behavior. Consider migrating

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
    setJoiningChannelId,
    setMicPermissionsErrorDismissed,
    setMicPermissionsGranted,
    setRecordingState,
    useCallsConfig,
    useCallsState,
    useChannelsWithCalls,
    useCurrentCall,
    useGlobalCallsState,
    useIncomingCalls,
    userReacted,
} from '@calls/state';
import {
    callEnded,
    callStarted,
    myselfLeftCall,
    setCalls,
    setCallScreenOff,
    setCallScreenOn,
    setChannelEnabled,
    setConfig,
    setPluginEnabled,
    setRaisedHand,
    setScreenShareURL,
    setSpeakerPhone,
    setUserMuted,
    setUserVoiceOn,
    userJoinedCall,
    userLeftCall,
} from '@calls/state/actions';
import {
    AudioDevice,
    type Call,
    type CallsState,
    type CurrentCall,
    DefaultCallsConfig,
    DefaultCallsState,
    DefaultCurrentCall,
    DefaultGlobalCallsState,
    DefaultIncomingCalls,
    type GlobalCallsState,
} from '@calls/types/calls';
import {License} from '@constants';
import Calls from '@constants/calls';
import DatabaseManager from '@database/manager';

import type {CallJobState, LiveCaptionData} from '@mattermost/calls/lib/types';

jest.mock('@calls/alerts');

jest.mock('@constants/calls', () => ({
    CALL_QUALITY_RESET_MS: 100,
}));

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
    getUserById: jest.fn(() => Promise.resolve({
        username: 'user-5',
    })),
}));

jest.mock('react-native-navigation', () => ({
    Navigation: {
        pop: jest.fn(() => Promise.resolve({
            catch: jest.fn(),
        })),
    },
}));

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
        act(() => userJoinedCall('server1', 'channel-1', 'user-3', 'session3'));
        assert.deepEqual((result.current[0] as CallsState).calls, expectedCallsState);
        assert.deepEqual(result.current[1], expectedChannelsWithCallsState);
        assert.deepEqual(result.current[2], expectedCurrentCallState);
        act(() => userJoinedCall('server1', 'invalid-channel', 'user-1', 'session1'));
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
        act(() => userLeftCall('server1', 'channel-1', 'session1'));
        assert.deepEqual((result.current[0] as CallsState).calls, expectedCallsState);
        assert.deepEqual(result.current[1], expectedChannelsWithCallsState);
        assert.deepEqual(result.current[2], expectedCurrentCallState);
        act(() => userLeftCall('server1', 'invalid-channel', 'session2'));
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
        act(() => userLeftCall('server1', 'channel-1', 'session1'));
        assert.deepEqual((result.current[0] as CallsState).calls, expectedCallsState);
        assert.deepEqual(result.current[1], expectedChannelsWithCallsState);
        assert.deepEqual(result.current[2], expectedCurrentCallState);
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
            return [useCallsState('server1'), useChannelsWithCalls('server1'), useCurrentCall()];
        });
        assert.deepEqual(result.current[0], DefaultCallsState);
        assert.deepEqual(result.current[1], {});
        assert.deepEqual(result.current[2], null);

        // test
        await act(async () => {
            setCurrentCall(initialCurrentCallState);
            await callStarted('server1', call1);
        });
        assert.deepEqual((result.current[0] as CallsState).calls, {'channel-1': call1});
        assert.deepEqual(result.current[1], {'channel-1': true});
        assert.deepEqual(result.current[2], initialCurrentCallState);
        expect(updateThreadFollowing).toBeCalled();
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
        act(() => setUserMuted('server1', 'channel-1', 'session1', true));
        assert.deepEqual((result.current[0] as CallsState).calls['channel-1'].sessions.session1.muted, true);
        assert.deepEqual((result.current[2] as CurrentCall | null)?.sessions.session1.muted, true);
        act(() => {
            setUserMuted('server1', 'channel-1', 'session1', false);
            setUserMuted('server1', 'channel-1', 'session2', false);
        });
        assert.deepEqual((result.current[0] as CallsState).calls['channel-1'].sessions.session1.muted, false);
        assert.deepEqual((result.current[0] as CallsState).calls['channel-1'].sessions.session2.muted, false);
        assert.deepEqual((result.current[2] as CurrentCall | null)?.sessions.session1.muted, false);
        assert.deepEqual((result.current[2] as CurrentCall | null)?.sessions.session2.muted, false);
        act(() => setUserMuted('server1', 'channel-1', 'session2', true));
        assert.deepEqual((result.current[0] as CallsState).calls['channel-1'].sessions.session2.muted, true);
        assert.deepEqual((result.current[2] as CurrentCall | null)?.sessions.session2.muted, true);
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
        act(() => setCallScreenOn('server1', 'channel-1', 'session1'));
        assert.deepEqual((result.current[0] as CallsState).calls['channel-1'].screenOn, 'session1');
        assert.deepEqual(result.current[1], initialChannelsWithCallsState);
        assert.deepEqual((result.current[2] as CurrentCall).screenOn, 'session1');
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
            return [useCallsState('server1'), useCurrentCall()];
        });
        act(() => {
            setCallsState('server1', initialCallsState);
            setCurrentCall(initialCurrentCallState);
        });
        assert.deepEqual(result.current[0], initialCallsState);
        assert.deepEqual(result.current[1], initialCurrentCallState);

        // test
        act(() => setRaisedHand('server1', 'channel-1', 'session2', 345));
        assert.deepEqual((result.current[0] as CallsState).calls, expectedCalls);
        assert.deepEqual((result.current[1] as CurrentCall | null), expectedCurrentCallState);

        act(() => setRaisedHand('server1', 'invalid-channel', 'session1', 345));
        assert.deepEqual((result.current[0] as CallsState).calls, expectedCalls);
        assert.deepEqual((result.current[1] as CurrentCall | null), expectedCurrentCallState);

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
            userJoinedCall('server1', 'channel-1', 'myUserId', 'mySessionId');
        });
        assert.deepEqual(result.current[0], expectedCallsState);
        assert.deepEqual(result.current[1], expectedCurrentCallState);

        act(() => {
            myselfLeftCall();
            userLeftCall('server1', 'channel-1', 'mySessionId');
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
        act(() => userJoinedCall('server1', 'channel-1', 'myUserId', 'mySessionId'));
        assert.deepEqual((result.current[1] as CurrentCall | null)?.screenShareURL, '');
        act(() => setScreenShareURL('testUrl'));
        assert.deepEqual((result.current[1] as CurrentCall | null)?.screenShareURL, 'testUrl');

        act(() => {
            myselfLeftCall();
            userLeftCall('server1', 'channel-1', 'mySessionId');
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

        // setup
        const {result} = renderHook(() => {
            return [useCallsState('server1'), useCurrentCall()];
        });
        act(() => setCallsState('server1', initialCallsState));
        assert.deepEqual(result.current[0], initialCallsState);
        assert.deepEqual(result.current[1], null);

        // test
        act(() => newCurrentCall('server1', 'channel-1', 'myUserId'));
        act(() => userJoinedCall('server1', 'channel-1', 'myUserId', 'mySessionId'));
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
            return [useCallsState('server1'), useCurrentCall()];
        });
        act(() => setCallsState('server1', initialCallsState));
        assert.deepEqual(result.current[0], initialCallsState);
        assert.deepEqual(result.current[1], null);

        // test
        act(() => newCurrentCall('server1', 'channel-1', 'myUserId'));
        act(() => userJoinedCall('server1', 'channel-1', 'myUserId', 'mySessionId'));
        assert.deepEqual((result.current[1] as CurrentCall | null)?.audioDeviceInfo, defaultAudioDeviceInfo);
        act(() => setAudioDeviceInfo(newAudioDeviceInfo));
        assert.deepEqual((result.current[1] as CurrentCall | null)?.audioDeviceInfo, newAudioDeviceInfo);
        assert.deepEqual((result.current[1] as CurrentCall | null)?.speakerphoneOn, false);
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
        act(() => {
            setMicPermissionsGranted(false);
            newCurrentCall('server1', 'channel-1', 'myUserId');
            userJoinedCall('server1', 'channel-1', 'myUserId', 'mySessionId');
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
        };

        // setup
        const {result} = renderHook(() => {
            return [useCallsState('server1'), useCurrentCall()];
        });
        act(() => setCallsState('server1', initialCallsState));
        assert.deepEqual(result.current[0], initialCallsState);
        assert.deepEqual(result.current[1], null);

        // join call
        act(() => {
            newCurrentCall('server1', 'channel-1', 'myUserId');
            userJoinedCall('server1', 'channel-1', 'myUserId', 'mySessionId');
        });
        assert.deepEqual(result.current[0], expectedCallsState);
        assert.deepEqual(result.current[1], currentCallNoAlertNoDismissed);

        // call quality goes bad
        act(() => processMeanOpinionScore(3.4999));
        assert.deepEqual((result.current[1] as CurrentCall).callQualityAlert, true);
        assert.equal((result.current[1] as CurrentCall).callQualityAlertDismissed, 0);

        // call quality goes good
        act(() => processMeanOpinionScore(4));
        assert.deepEqual(result.current[1], currentCallNoAlertNoDismissed);

        // call quality goes bad
        act(() => processMeanOpinionScore(3.499));
        assert.deepEqual((result.current[1] as CurrentCall).callQualityAlert, true);
        assert.equal((result.current[1] as CurrentCall).callQualityAlertDismissed, 0);

        // dismiss call quality alert
        const timeNow = Date.now();
        act(() => setCallQualityAlertDismissed());
        assert.deepEqual((result.current[1] as CurrentCall).callQualityAlert, false);
        assert.equal((result.current[1] as CurrentCall).callQualityAlertDismissed >= timeNow &&
            (result.current[1] as CurrentCall).callQualityAlertDismissed <= Date.now(), true);

        // call quality goes bad, but we're not past the dismissed limit
        act(() => processMeanOpinionScore(3.4999));
        assert.deepEqual((result.current[1] as CurrentCall).callQualityAlert, false);

        // test that the dismiss expired
        await act(async () => {
            await new Promise((r) => setTimeout(r, 101));
            processMeanOpinionScore(3.499);
        });
        assert.deepEqual((result.current[1] as CurrentCall).callQualityAlert, true);
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

    it('incoming calls', async () => {
        const calls = {'channel-dm': callDM};
        const afterLoadCallsState: CallsState = {
            myUserId: 'myId',
            calls,
            enabled: {},
        };
        const initialCurrentCallState: CurrentCall | null = null;
        const initialIncomingCalls = DefaultIncomingCalls;
        const expectedIncomingCalls = {
            incomingCalls: [{
                callID: 'callDM',
                callerID: 'user-5',
                callerModel: {username: 'user-5'},
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

    it('captions', () => {
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
            return [useCallsState('server1'), useCurrentCall()];
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
        let currentCall = result.current[1] as CurrentCall;
        assert.equal(currentCall.captions.session1.text, 'caption 2');
        assert.equal(currentCall.captions.session2.text, 'caption 1 user 2');

        // test sending the next captions for users 1 and 2
        act(() => {
            receivedCaption('server1', caption3user1Data);
            receivedCaption('server1', caption2user2Data);
        });
        assert.deepEqual(result.current[0], initialCallsState);
        currentCall = result.current[1] as CurrentCall;
        assert.equal(currentCall.captions.session1.text, 'caption 3');
        assert.equal(currentCall.captions.session2.text, 'caption 2 user 2');
    });
});
