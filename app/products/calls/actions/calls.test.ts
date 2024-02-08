// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'assert';

import {act, renderHook} from '@testing-library/react-hooks';
import {createIntl} from 'react-intl';
import InCallManager from 'react-native-incall-manager';

import * as CallsActions from '@calls/actions';
import {getConnectionForTesting} from '@calls/actions/calls';
import * as Permissions from '@calls/actions/permissions';
import {needsRecordingWillBePostedAlert, needsRecordingErrorAlert} from '@calls/alerts';
import {userLeftChannelErr, userRemovedFromChannelErr} from '@calls/errors';
import * as State from '@calls/state';
import {
    myselfLeftCall,
    newCurrentCall,
    setCallsConfig,
    setCallsState,
    setChannelsWithCalls,
    setCurrentCall,
    useCallsConfig,
    useCallsState,
    useChannelsWithCalls,
    useCurrentCall,
    userJoinedCall,
} from '@calls/state';
import {
    type Call,
    type CallsState,
    type ChannelsWithCalls,
    type CurrentCall,
    DefaultCallsConfig,
    DefaultCallsState,
} from '@calls/types/calls';
import {errorAlert} from '@calls/utils';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';

const mockClient = {
    getCalls: jest.fn(() => [
        {
            call: {
                sessions: {
                    session1: {session_id: 'session1', user_id: 'user-1', unmuted: true},
                    session2: {session_id: 'session1', user_id: 'user-1', unmuted: false},
                },
                start_at: 123,
                screen_sharing_id: '',
                thread_id: 'thread-1',
            },
            channel_id: 'channel-1',
            enabled: true,
        },
    ]),
    getCallsConfig: jest.fn(() => ({
        ICEServers: ['mattermost.com'],
        AllowEnableCalls: true,
        DefaultEnabled: true,
        last_retrieved_at: 1234,
    })),
    getVersion: jest.fn(() => ({})),
    getPluginsManifests: jest.fn(() => (
        [
            {id: 'playbooks'},
            {id: 'com.mattermost.calls'},
        ]
    )),
    enableChannelCalls: jest.fn(),
    startCallRecording: jest.fn(),
    stopCallRecording: jest.fn(),
    dismissCall: jest.fn(),
};

jest.mock('@calls/connection/connection', () => ({
    newConnection: jest.fn((serverURL, channelId, onClose) => Promise.resolve({
        disconnect: jest.fn((err?: Error) => onClose(err)),
        mute: jest.fn(),
        unmute: jest.fn(),
        waitForPeerConnection: jest.fn(() => Promise.resolve()),
    })),
}));

jest.mock('@actions/remote/thread', () => ({
    updateThreadFollowing: jest.fn(() => Promise.resolve({})),
}));

jest.mock('@queries/servers/thread', () => ({
    getThreadById: jest.fn(() => Promise.resolve({
        isFollowing: false,
    })),
}));

jest.mock('@calls/alerts', () => {
    const alerts = jest.requireActual('../alerts');
    return {
        needsRecordingErrorAlert: jest.fn(),
        needsRecordingWillBePostedAlert: jest.fn(),
        showErrorAlertOnClose: alerts.showErrorAlertOnClose,
    };
});

jest.mock('@calls/utils');

jest.mock('react-native-navigation', () => ({
    Navigation: {
        pop: jest.fn(() => Promise.resolve({
            catch: jest.fn(),
        })),
    },
}));

const addFakeCall = (serverUrl: string, channelId: string) => {
    const call: Call = {
        id: 'call',
        sessions: {
            a23456abcdefghijklmnopqrs: {sessionId: 'a23456abcdefghijklmnopqrs', userId: 'xohi8cki9787fgiryne716u84o', muted: false, raisedHand: 0},
            a12345667890bcdefghijklmn1: {sessionId: 'a12345667890bcdefghijklmn1', userId: 'xohi8cki9787fgiryne716u84o', muted: true, raisedHand: 0},
            a12345667890bcdefghijklmn2: {sessionId: 'a12345667890bcdefghijklmn2', userId: 'xohi8cki9787fgiryne716u84o', muted: false, raisedHand: 0},
            a12345667890bcdefghijklmn3: {sessionId: 'a12345667890bcdefghijklmn3', userId: 'xohi8cki9787fgiryne716u84o', muted: true, raisedHand: 0},
            a12345667890bcdefghijklmn4: {sessionId: 'a12345667890bcdefghijklmn4', userId: 'xohi8cki9787fgiryne716u84o', muted: false, raisedHand: 0},
            a12345667890bcdefghijklmn5: {sessionId: 'a12345667890bcdefghijklmn5', userId: 'xohi8cki9787fgiryne716u84o', muted: true, raisedHand: 0},
        },
        channelId,
        startTime: (new Date()).getTime(),
        screenOn: '',
        threadId: 'abcd1234567',
        ownerId: 'xohi8cki9787fgiryne716u84o',
        hostId: 'xohi8cki9787fgiryne716u84o',
        dismissed: {},
    };
    act(() => {
        State.setCallsState(serverUrl, {myUserId: 'myUserId', calls: {}, enabled: {}});
        State.callStarted(serverUrl, call);
    });
};

describe('Actions.Calls', () => {
    const {newConnection} = require('@calls/connection/connection');
    const {updateThreadFollowing} = require('@actions/remote/thread');

    InCallManager.setSpeakerphoneOn = jest.fn();
    InCallManager.setForceSpeakerphoneOn = jest.fn();
    // eslint-disable-next-line
    // @ts-ignore
    NetworkManager.getClient = () => mockClient;
    jest.spyOn(Permissions, 'hasMicrophonePermission').mockReturnValue(Promise.resolve(true));

    beforeAll(async () => {
        await DatabaseManager.init(['server1']);

        // create subjects
        const {result} = renderHook(() => {
            return [useCallsState('server1'), useChannelsWithCalls('server1'), useCurrentCall(), useCallsConfig('server1')];
        });

        assert.deepEqual(result.current[0], DefaultCallsState);
        assert.deepEqual(result.current[1], {});
        assert.deepEqual(result.current[2], null);
        assert.deepEqual(result.current[3], DefaultCallsConfig);
    });

    beforeEach(() => {
        newConnection.mockClear();
        updateThreadFollowing.mockClear();
        mockClient.getCalls.mockClear();
        mockClient.getCallsConfig.mockClear();
        mockClient.getPluginsManifests.mockClear();
        mockClient.enableChannelCalls.mockClear();

        // reset to default state for each test
        act(() => {
            setCallsState('server1', DefaultCallsState);
            setChannelsWithCalls('server1', {});
            setCurrentCall(null);
            setCallsConfig('server1', {...DefaultCallsConfig, EnableRinging: true});
        });
    });

    it('joinCall', async () => {
        // setup
        const {result} = renderHook(() => {
            return [useCallsState('server1'), useCurrentCall()];
        });
        addFakeCall('server1', 'channel-id');

        let response: { data?: string };
        await act(async () => {
            response = await CallsActions.joinCall('server1', 'channel-id', 'myUserId', true, createIntl({
                locale: 'en',
                messages: {},
            }));

            // manually call newCurrentConnection because newConnection is mocked
            newCurrentCall('server1', 'channel-id', 'myUserId');
        });

        assert.equal(response!.data, 'channel-id');
        assert.equal((result.current[1] as CurrentCall).channelId, 'channel-id');
        expect(newConnection).toBeCalled();
        expect(newConnection.mock.calls[0][1]).toBe('channel-id');
        expect(updateThreadFollowing).toBeCalled();

        await act(async () => {
            CallsActions.leaveCall();
        });
    });

    it('leaveCall', async () => {
        // setup
        const {result} = renderHook(() => {
            return [useCallsState('server1'), useCurrentCall()];
        });
        addFakeCall('server1', 'channel-id');
        expect(getConnectionForTesting()).toBe(null);

        let response: { data?: string };
        await act(async () => {
            response = await CallsActions.joinCall('server1', 'channel-id', 'myUserId', true, createIntl({
                locale: 'en',
                messages: {},
            }));

            // manually call newCurrentConnection because newConnection is mocked
            newCurrentCall('server1', 'channel-id', 'myUserId');
            userJoinedCall('server1', 'channel-id', 'myUserId', 'mySessionId');
        });
        assert.equal(response!.data, 'channel-id');
        assert.equal((result.current[1] as CurrentCall | null)?.channelId, 'channel-id');

        expect(getConnectionForTesting()!.disconnect).not.toBeCalled();
        const disconnectMock = getConnectionForTesting()!.disconnect;

        await act(async () => {
            CallsActions.leaveCall();

            // because disconnect is mocked
            myselfLeftCall();
        });

        expect(disconnectMock).toBeCalled();
        expect(getConnectionForTesting()).toBe(null);
        assert.equal((result.current[1] as CurrentCall | null), null);
    });

    it('muteMyself', async () => {
        // setup
        const {result} = renderHook(() => {
            return [useCallsState('server1'), useCurrentCall()];
        });
        addFakeCall('server1', 'channel-id');
        expect(getConnectionForTesting()).toBe(null);

        let response: { data?: string };
        await act(async () => {
            response = await CallsActions.joinCall('server1', 'channel-id', 'myUserId', true, createIntl({
                locale: 'en',
                messages: {},
            }));

            // manually call newCurrentConnection because newConnection is mocked
            newCurrentCall('server1', 'channel-id', 'myUserId');
            userJoinedCall('server1', 'channel-id', 'myUserId', 'mySessionId');
        });
        assert.equal(response!.data, 'channel-id');
        assert.equal((result.current[1] as CurrentCall | null)?.channelId, 'channel-id');

        await act(async () => {
            CallsActions.muteMyself();
        });

        expect(getConnectionForTesting()!.mute).toBeCalled();

        await act(async () => {
            CallsActions.leaveCall();
        });
    });

    it('unmuteMyself', async () => {
        // setup
        const {result} = renderHook(() => {
            return [useCallsState('server1'), useCurrentCall()];
        });
        addFakeCall('server1', 'channel-id');
        expect(getConnectionForTesting()).toBe(null);

        let response: { data?: string };
        await act(async () => {
            response = await CallsActions.joinCall('server1', 'channel-id', 'mysUserId', true, createIntl({
                locale: 'en',
                messages: {},
            }));

            // manually call newCurrentConnection because newConnection is mocked
            newCurrentCall('server1', 'channel-id', 'myUserId');
            userJoinedCall('server1', 'channel-id', 'myUserId', 'mySessionId');
        });
        assert.equal(response!.data, 'channel-id');
        assert.equal((result.current[1] as CurrentCall | null)?.channelId, 'channel-id');

        await act(async () => {
            CallsActions.unmuteMyself();
        });

        expect(getConnectionForTesting()!.unmute).toBeCalled();

        await act(async () => {
            CallsActions.leaveCall();
        });
    });

    it('loadCalls', async () => {
        // setup
        const {result} = renderHook(() => {
            return [useCallsState('server1'), useChannelsWithCalls('server1'), useCurrentCall()];
        });

        await act(async () => {
            await CallsActions.loadCalls('server1', 'userId1');
        });
        expect(mockClient.getCalls).toBeCalled();
        assert.equal((result.current[0] as CallsState).calls['channel-1'].channelId, 'channel-1');
        assert.equal((result.current[0] as CallsState).enabled['channel-1'], true);
        assert.equal((result.current[1] as ChannelsWithCalls)['channel-1'], true);
        assert.equal((result.current[2] as CurrentCall | null), null);
    });

    it('loadCalls fails from server', async () => {
        const expectedCallsState: CallsState = {
            myUserId: 'userId1',
            calls: {},
            enabled: {},
        };

        // setup
        const oldGetCalls = mockClient.getCalls;

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        mockClient.getCalls = jest.fn(() => null);

        const {result} = renderHook(() => {
            return [useCallsState('server1'), useChannelsWithCalls('server1'), useCurrentCall()];
        });

        await act(async () => {
            await CallsActions.loadCalls('server1', 'userId1');
        });
        expect(mockClient.getCalls).toBeCalled();
        assert.deepEqual((result.current[0] as CallsState), expectedCallsState);
        assert.deepEqual((result.current[1] as ChannelsWithCalls), {});
        assert.equal((result.current[2] as CurrentCall | null), null);

        mockClient.getCalls = oldGetCalls;
    });

    it('loadConfig', async () => {
        // setup
        const {result} = renderHook(() => useCallsConfig('server1'));

        await act(async () => {
            await CallsActions.loadConfig('server1');
        });
        expect(mockClient.getCallsConfig).toBeCalledWith();
        assert.equal(result.current.DefaultEnabled, true);
        assert.equal(result.current.AllowEnableCalls, true);
    });

    it('enableChannelCalls', async () => {
        const {result} = renderHook(() => useCallsState('server1'));
        assert.equal(result.current.enabled['channel-1'], undefined);
        mockClient.enableChannelCalls.mockReturnValueOnce({enabled: true});
        await act(async () => {
            await CallsActions.enableChannelCalls('server1', 'channel-1', true);
        });
        expect(mockClient.enableChannelCalls).toBeCalledWith('channel-1', true);
        assert.equal(result.current.enabled['channel-1'], true);
    });

    it('disableChannelCalls', async () => {
        const {result} = renderHook(() => useCallsState('server1'));
        assert.equal(result.current.enabled['channel-1'], undefined);
        mockClient.enableChannelCalls.mockReturnValueOnce({enabled: true});
        await act(async () => {
            await CallsActions.enableChannelCalls('server1', 'channel-1', true);
        });
        expect(mockClient.enableChannelCalls).toBeCalledWith('channel-1', true);
        assert.equal(result.current.enabled['channel-1'], true);
        mockClient.enableChannelCalls.mockReturnValueOnce({enabled: false});
        await act(async () => {
            await CallsActions.enableChannelCalls('server1', 'channel-1', false);
        });
        expect(mockClient.enableChannelCalls).toBeCalledWith('channel-1', false);
        assert.equal(result.current.enabled['channel-1'], false);
    });

    it('startCallRecording', async () => {
        await act(async () => {
            await CallsActions.startCallRecording('server1', 'channel-id');
        });

        expect(mockClient.startCallRecording).toBeCalledWith('channel-id');
        expect(needsRecordingErrorAlert).toBeCalled();
    });

    it('stopCallRecording', async () => {
        await act(async () => {
            await CallsActions.stopCallRecording('server1', 'channel-id');
        });

        expect(mockClient.stopCallRecording).toBeCalledWith('channel-id');
        expect(needsRecordingErrorAlert).toBeCalled();
        expect(needsRecordingWillBePostedAlert).toBeCalled();
    });

    it('dismissIncomingCall', async () => {
        await act(async () => {
            await CallsActions.dismissIncomingCall('server1', 'channel-id');
        });

        expect(mockClient.dismissCall).toBeCalledWith('channel-id');
    });

    it('userLeftChannelErr', async () => {
        // setup
        const {result} = renderHook(() => {
            return [useCallsState('server1'), useCurrentCall()];
        });
        addFakeCall('server1', 'channel-id');

        let response: { data?: string };

        const intl = createIntl({
            locale: 'en',
            messages: {},
        });
        intl.formatMessage = jest.fn();

        await act(async () => {
            response = await CallsActions.joinCall('server1', 'channel-id', 'myUserId', true, intl);

            // manually call newCurrentConnection because newConnection is mocked
            newCurrentCall('server1', 'channel-id', 'myUserId');
        });

        assert.equal(response!.data, 'channel-id');
        assert.equal((result.current[1] as CurrentCall).channelId, 'channel-id');
        expect(newConnection).toBeCalled();
        expect(newConnection.mock.calls[0][1]).toBe('channel-id');
        expect(updateThreadFollowing).toBeCalled();

        await act(async () => {
            CallsActions.leaveCall(userLeftChannelErr);
        });

        expect(intl.formatMessage).toBeCalledWith({
            id: 'mobile.calls_user_left_channel_error_title',
            defaultMessage: 'You left the channel',
        });

        expect(intl.formatMessage).toBeCalledWith({
            id: 'mobile.calls_user_left_channel_error_message',
            defaultMessage: 'You have left the channel, and have been disconnected from the call.',
        });
    });

    it('userRemovedFromChannelErr', async () => {
        // setup
        const {result} = renderHook(() => {
            return [useCallsState('server1'), useCurrentCall()];
        });
        addFakeCall('server1', 'channel-id');

        let response: { data?: string };

        const intl = createIntl({
            locale: 'en',
            messages: {},
        });
        intl.formatMessage = jest.fn();

        await act(async () => {
            response = await CallsActions.joinCall('server1', 'channel-id', 'myUserId', true, intl);

            // manually call newCurrentConnection because newConnection is mocked
            newCurrentCall('server1', 'channel-id', 'myUserId');
        });

        assert.equal(response!.data, 'channel-id');
        assert.equal((result.current[1] as CurrentCall).channelId, 'channel-id');
        expect(newConnection).toBeCalled();
        expect(newConnection.mock.calls[0][1]).toBe('channel-id');
        expect(updateThreadFollowing).toBeCalled();

        await act(async () => {
            CallsActions.leaveCall(userRemovedFromChannelErr);
        });

        expect(intl.formatMessage).toBeCalledWith({
            id: 'mobile.calls_user_removed_from_channel_error_title',
            defaultMessage: 'You were removed from channel',
        });

        expect(intl.formatMessage).toBeCalledWith({
            id: 'mobile.calls_user_removed_from_channel_error_message',
            defaultMessage: 'You have been removed from the channel, and have been disconnected from the call.',
        });
    });

    it('generic error on close', async () => {
        // setup
        const {result} = renderHook(() => {
            return [useCallsState('server1'), useCurrentCall()];
        });
        addFakeCall('server1', 'channel-id');

        let response: { data?: string };

        const intl = createIntl({
            locale: 'en',
            messages: {},
        });
        intl.formatMessage = jest.fn();

        await act(async () => {
            response = await CallsActions.joinCall('server1', 'channel-id', 'myUserId', true, intl);

            // manually call newCurrentConnection because newConnection is mocked
            newCurrentCall('server1', 'channel-id', 'myUserId');
        });

        assert.equal(response!.data, 'channel-id');
        assert.equal((result.current[1] as CurrentCall).channelId, 'channel-id');
        expect(newConnection).toBeCalled();
        expect(newConnection.mock.calls[0][1]).toBe('channel-id');
        expect(updateThreadFollowing).toBeCalled();

        await act(async () => {
            CallsActions.leaveCall(new Error('generic error'));
        });

        expect(errorAlert).toBeCalled();
    });
});
