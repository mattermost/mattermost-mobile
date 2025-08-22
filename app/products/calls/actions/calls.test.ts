// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'assert';

import {act, renderHook} from '@testing-library/react-hooks'; // Use instead of react-native version due to different behavior. Consider migrating
import {createIntl} from 'react-intl';
import {Alert} from 'react-native';
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
    getCurrentCall,
} from '@calls/state';
import * as StateActions from '@calls/state/actions';
import {
    type Call,
    type CallsState,
    type ChannelsWithCalls,
    type CurrentCall,
    AudioDevice,
    DefaultCallsConfig,
    DefaultCallsState,
} from '@calls/types/calls';
import {errorAlert} from '@calls/utils';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';

import type {CallJobState} from '@mattermost/calls/lib/types';

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
    hostMake: jest.fn(),
    hostMute: jest.fn(),
    hostMuteOthers: jest.fn(),
    hostScreenOff: jest.fn(),
    hostLowerHand: jest.fn(),
    hostRemove: jest.fn(),
    endCall: jest.fn(),
    getCallsConfig: jest.fn(),
    getCallForChannel: jest.fn(),
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
        waitForPeerConnection: jest.fn(() => Promise.resolve('session-id')),
        initializeVoiceTrack: jest.fn(),
        sendReaction: jest.fn(),
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
        leaveAndJoinWithAlert: alerts.leaveAndJoinWithAlert,
    };
});

jest.mock('@calls/utils');

jest.mock('react-native-navigation', () => ({
    Navigation: {
        pop: jest.fn(() => Promise.resolve({
            catch: jest.fn(),
        })),
        setDefaultOptions: jest.fn(),
    },
}));

jest.mock('@actions/remote/session', () => ({
    forceLogoutIfNecessary: jest.fn(),
}));

jest.mock('@queries/servers/user', () => ({
    getCurrentUser: jest.fn(),
    getUserById: jest.fn(),
}));

jest.mock('@queries/servers/channel', () => ({
    getChannelById: jest.fn(),
}));

jest.mock('@queries/servers/system', () => ({
    getLicense: jest.fn(),
    getConfig: jest.fn(),
}));

jest.mock('@queries/servers/preference', () => ({
    queryDisplayNamePreferences: jest.fn(),
}));

const addFakeCall = (serverUrl: string, channelId: string) => {
    const call: Call = {
        id: 'call',
        sessions: {
            a23456abcdefghijklmnopqrs: {
                sessionId: 'a23456abcdefghijklmnopqrs',
                userId: 'xohi8cki9787fgiryne716u84o',
                muted: false,
                raisedHand: 0,
            },
            a12345667890bcdefghijklmn1: {
                sessionId: 'a12345667890bcdefghijklmn1',
                userId: 'xohi8cki9787fgiryne716u84o',
                muted: true,
                raisedHand: 0,
            },
            a12345667890bcdefghijklmn2: {
                sessionId: 'a12345667890bcdefghijklmn2',
                userId: 'xohi8cki9787fgiryne716u84o',
                muted: false,
                raisedHand: 0,
            },
            a12345667890bcdefghijklmn3: {
                sessionId: 'a12345667890bcdefghijklmn3',
                userId: 'xohi8cki9787fgiryne716u84o',
                muted: true,
                raisedHand: 0,
            },
            a12345667890bcdefghijklmn4: {
                sessionId: 'a12345667890bcdefghijklmn4',
                userId: 'xohi8cki9787fgiryne716u84o',
                muted: false,
                raisedHand: 0,
            },
            a12345667890bcdefghijklmn5: {
                sessionId: 'a12345667890bcdefghijklmn5',
                userId: 'xohi8cki9787fgiryne716u84o',
                muted: true,
                raisedHand: 0,
            },
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
    InCallManager.chooseAudioRoute = jest.fn();

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
        mockClient.getPluginsManifests.mockClear();
        mockClient.getPluginsManifests = jest.fn(() => (
            [
                {id: 'playbooks'},
                {id: 'com.mattermost.calls'},
            ]
        ));
        mockClient.enableChannelCalls.mockClear();

        // reset to default state for each test
        act(() => {
            setCallsState('server1', DefaultCallsState);
            setChannelsWithCalls('server1', {});
            setCurrentCall(null);
            setCallsConfig('server1', {...DefaultCallsConfig, EnableRinging: true});
        });
    });

    const forceLogout = require('@actions/remote/session').forceLogoutIfNecessary;
    const forceLogoutError = {status_code: 401};

    it('joinCall', async () => {
        // setup
        const {result} = renderHook(() => {
            return [useCallsState('server1'), useCurrentCall()];
        });
        addFakeCall('server1', 'channel-id');
        const setCurrentCallConnectedMock = jest.spyOn(StateActions, 'setCurrentCallConnected');

        let response: { data?: string };
        await act(async () => {
            response = await CallsActions.joinCall('server1', 'channel-id', 'myUserId', true, createIntl({
                locale: 'en',
                messages: {},
            }));

            expect(setCurrentCallConnectedMock).toHaveBeenCalledWith('channel-id', 'session-id');

            // manually call newCurrentConnection because newConnection is mocked
            newCurrentCall('server1', 'channel-id', 'myUserId');
        });

        assert.equal(response!.data, 'channel-id');
        assert.equal((result.current[1] as CurrentCall).channelId, 'channel-id');
        expect(newConnection).toHaveBeenCalled();
        expect(newConnection.mock.calls[0][1]).toBe('channel-id');
        expect(updateThreadFollowing).toHaveBeenCalled();

        await act(async () => {
            CallsActions.leaveCall();
        });

        // Test error case
        newConnection.mockRejectedValueOnce(forceLogoutError);
        await act(async () => {
            await expect(CallsActions.joinCall('server1', 'channel-id', 'myUserId', true, createIntl({
                locale: 'en',
                messages: {},
            }))).resolves.toStrictEqual({error: forceLogoutError});
            expect(forceLogout).toHaveBeenCalledWith('server1', forceLogoutError);
        });

        // Test failure to connect case
        const connection = {
            disconnect: jest.fn(),
            waitForPeerConnection: jest.fn().mockRejectedValueOnce(new Error('failed to connect')),
        };
        newConnection.mockResolvedValueOnce(connection);

        await act(async () => {
            const res = await CallsActions.joinCall('server1', 'channel-id', 'myUserId', true, createIntl({
                locale: 'en',
                messages: {},
            }));
            expect(res).toStrictEqual({error: 'unable to connect to the voice call: Error: failed to connect'});
            expect(connection.disconnect).toHaveBeenCalled();
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

        expect(getConnectionForTesting()!.disconnect).not.toHaveBeenCalled();
        const disconnectMock = getConnectionForTesting()!.disconnect;

        await act(async () => {
            CallsActions.leaveCall();

            // because disconnect is mocked
            myselfLeftCall();
        });

        expect(disconnectMock).toHaveBeenCalled();
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

        expect(getConnectionForTesting()!.mute).toHaveBeenCalled();

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

        expect(getConnectionForTesting()!.unmute).toHaveBeenCalled();

        await act(async () => {
            CallsActions.leaveCall();
        });
    });

    it('loadCalls', async () => {
        // setup
        const {result} = renderHook(() => {
            return [useCallsState('server1'), useChannelsWithCalls('server1'), useCurrentCall()];
        });

        // Test successful case
        await act(async () => {
            const successResult = await CallsActions.loadCalls('server1', 'userId1');
            expect(successResult.data).toBeDefined();
            expect(mockClient.getCalls).toHaveBeenCalled();
            assert.equal((result.current[0] as CallsState).calls['channel-1'].channelId, 'channel-1');
            assert.equal((result.current[0] as CallsState).enabled['channel-1'], true);
            assert.equal((result.current[1] as ChannelsWithCalls)['channel-1'], true);
            assert.equal((result.current[2] as CurrentCall | null), null);
        });

        // Test error case
        mockClient.getCalls = jest.fn().mockRejectedValueOnce(forceLogoutError);

        await act(async () => {
            const errorResult = await CallsActions.loadCalls('server1', 'userId1');
            expect(errorResult.error).toBe(forceLogoutError);
            expect(forceLogout).toHaveBeenCalledWith('server1', forceLogoutError);
        });
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
        expect(mockClient.getCalls).toHaveBeenCalled();
        assert.deepEqual((result.current[0] as CallsState), expectedCallsState);
        assert.deepEqual((result.current[1] as ChannelsWithCalls), {});
        assert.equal((result.current[2] as CurrentCall | null), null);

        mockClient.getCalls = oldGetCalls;
    });

    it('loadConfig', async () => {
        // setup
        const {result} = renderHook(() => useCallsConfig('server1'));

        // Test successful case
        await act(async () => {
            mockClient.getCallsConfig.mockReturnValueOnce({DefaultEnabled: true, AllowEnableCalls: true});
            const successResult = await CallsActions.loadConfig('server1', false, 'Server Switch');
            expect(successResult.data).toBeDefined();
            expect(mockClient.getCallsConfig).toHaveBeenCalledWith('Server Switch');
            assert.equal(result.current.DefaultEnabled, true);
            assert.equal(result.current.AllowEnableCalls, true);
        });

        // Test successful retrival from cache
        await act(async () => {
            expect(mockClient.getCallsConfig).toHaveBeenCalledTimes(1);
            const successResult = await CallsActions.loadConfig('server1', false, 'Server Switch');
            expect(successResult.data).toBeDefined();
            expect(mockClient.getCallsConfig).toHaveBeenCalledTimes(1);
        });

        // Test error case
        mockClient.getCallsConfig.mockRejectedValueOnce(forceLogoutError);

        const errorResult = await CallsActions.loadConfig('server1', true, 'Server Switch');
        expect(errorResult.error).toBe(forceLogoutError);
        expect(forceLogout).toHaveBeenCalledWith('server1', forceLogoutError);
    });

    it('enableChannelCalls', async () => {
        const {result} = renderHook(() => useCallsState('server1'));

        // Test successful case
        assert.equal(result.current.enabled['channel-1'], undefined);
        mockClient.enableChannelCalls.mockReturnValueOnce({enabled: true});
        await act(async () => {
            const successResult = await CallsActions.enableChannelCalls('server1', 'channel-1', true);
            expect(successResult).toEqual({});
            expect(mockClient.enableChannelCalls).toHaveBeenCalledWith('channel-1', true);
            assert.equal(result.current.enabled['channel-1'], true);
        });

        // Test error case
        mockClient.enableChannelCalls.mockRejectedValueOnce(forceLogoutError);

        await act(async () => {
            const errorResult = await CallsActions.enableChannelCalls('server1', 'channel-1', true);
            expect(errorResult.error).toBe(forceLogoutError);
            expect(forceLogout).toHaveBeenCalledWith('server1', forceLogoutError);
        });
    });

    it('disableChannelCalls', async () => {
        const {result} = renderHook(() => useCallsState('server1'));
        assert.equal(result.current.enabled['channel-1'], undefined);
        mockClient.enableChannelCalls.mockReturnValueOnce({enabled: true});
        await act(async () => {
            await CallsActions.enableChannelCalls('server1', 'channel-1', true);
        });
        expect(mockClient.enableChannelCalls).toHaveBeenCalledWith('channel-1', true);
        assert.equal(result.current.enabled['channel-1'], true);
        mockClient.enableChannelCalls.mockReturnValueOnce({enabled: false});
        await act(async () => {
            await CallsActions.enableChannelCalls('server1', 'channel-1', false);
        });
        expect(mockClient.enableChannelCalls).toHaveBeenCalledWith('channel-1', false);
        assert.equal(result.current.enabled['channel-1'], false);
    });

    it('startCallRecording', async () => {
        await act(async () => {
            // Test successful case
            const successResult = await CallsActions.startCallRecording('server1', 'channel-id');
            expect(successResult).toBe(undefined);
            expect(mockClient.startCallRecording).toHaveBeenCalledWith('channel-id');
            expect(needsRecordingErrorAlert).toHaveBeenCalled();

            // Test error case
            mockClient.startCallRecording.mockRejectedValueOnce(forceLogoutError);

            const errorResult = await CallsActions.startCallRecording('server1', 'channel-id');
            expect(errorResult).toBe(forceLogoutError);
            expect(forceLogout).toHaveBeenCalledWith('server1', forceLogoutError);
        });
    });

    it('stopCallRecording', async () => {
        await act(async () => {
            // Test successful case
            const successResult = await CallsActions.stopCallRecording('server1', 'channel-id');
            expect(successResult).toBe(undefined);
            expect(mockClient.stopCallRecording).toHaveBeenCalledWith('channel-id');
            expect(needsRecordingErrorAlert).toHaveBeenCalled();
            expect(needsRecordingWillBePostedAlert).toHaveBeenCalled();

            // Test error case
            mockClient.stopCallRecording.mockRejectedValueOnce(forceLogoutError);

            const errorResult = await CallsActions.stopCallRecording('server1', 'channel-id');
            expect(errorResult).toBe(forceLogoutError);
            expect(forceLogout).toHaveBeenCalledWith('server1', forceLogoutError);
        });
    });

    it('dismissIncomingCall', async () => {
        // Test successful case
        await act(async () => {
            await CallsActions.dismissIncomingCall('server1', 'channel-id');
        });
        expect(mockClient.dismissCall).toHaveBeenCalledWith('channel-id');

        // Test error case
        mockClient.dismissCall.mockRejectedValueOnce(forceLogoutError);

        const errorResult = await CallsActions.dismissIncomingCall('server1', 'channel-id');
        expect(errorResult).toBe(forceLogoutError);
        expect(forceLogout).toHaveBeenCalledWith('server1', forceLogoutError);

        // Test when ringing is disabled
        act(() => {
            setCallsConfig('server1', {...DefaultCallsConfig, EnableRinging: false});
        });

        const result = await CallsActions.dismissIncomingCall('server1', 'channel-id');
        expect(result).toEqual({});
        expect(mockClient.dismissCall).toHaveBeenCalledTimes(2); // Called twice - success case and error case
    });

    it('hostMake', async () => {
        // Test successful case
        const successResult = await CallsActions.hostMake('server1', 'call1', 'user1');
        expect(successResult).toBe(undefined);
        expect(mockClient.hostMake).toHaveBeenCalledWith('call1', 'user1');

        // Test error case
        mockClient.hostMake.mockRejectedValueOnce(forceLogoutError);

        const errorResult = await CallsActions.hostMake('server1', 'call1', 'user1');
        expect(errorResult).toBe(forceLogoutError);
        expect(forceLogout).toHaveBeenCalledWith('server1', forceLogoutError);
    });

    it('hostMuteSession', async () => {
        // Test successful case
        const successfulResult = await CallsActions.hostMuteSession('server1', 'call1', 'session1');
        expect(successfulResult).toBe(undefined);
        expect(mockClient.hostMute).toHaveBeenCalledWith('call1', 'session1');

        // Test error case
        mockClient.hostMute.mockRejectedValueOnce(forceLogoutError);

        const errorResult = await CallsActions.hostMuteSession('server1', 'call1', 'session1');
        expect(errorResult).toBe(forceLogoutError);
        expect(forceLogout).toHaveBeenCalledWith('server1', forceLogoutError);
    });

    it('hostMuteOthers', async () => {
        await act(async () => {
            // Test successful case
            const successResult = await CallsActions.hostMuteOthers('server1', 'call1');
            expect(successResult).toBe(undefined);
            expect(mockClient.hostMuteOthers).toHaveBeenCalledWith('call1');

            // Test error case
            mockClient.hostMuteOthers.mockRejectedValueOnce(forceLogoutError);

            const errorResult = await CallsActions.hostMuteOthers('server1', 'call1');
            expect(errorResult).toBe(forceLogoutError);
            expect(forceLogout).toHaveBeenCalledWith('server1', forceLogoutError);
        });
    });

    it('hostStopScreenshare', async () => {
        await act(async () => {
            // Test successful case
            const successResult = await CallsActions.hostStopScreenshare('server1', 'call1', 'session1');
            expect(successResult).toBe(undefined);
            expect(mockClient.hostScreenOff).toHaveBeenCalledWith('call1', 'session1');

            // Test error case
            mockClient.hostScreenOff.mockRejectedValueOnce(forceLogoutError);

            const errorResult = await CallsActions.hostStopScreenshare('server1', 'call1', 'session1');
            expect(errorResult).toBe(forceLogoutError);
            expect(forceLogout).toHaveBeenCalledWith('server1', forceLogoutError);
        });
    });

    it('hostLowerHand', async () => {
        await act(async () => {
            // Test successful case
            const successResult = await CallsActions.hostLowerHand('server1', 'call1', 'session1');
            expect(successResult).toBe(undefined);
            expect(mockClient.hostLowerHand).toHaveBeenCalledWith('call1', 'session1');

            // Test error case
            mockClient.hostLowerHand.mockRejectedValueOnce(forceLogoutError);

            const errorResult = await CallsActions.hostLowerHand('server1', 'call1', 'session1');
            expect(errorResult).toBe(forceLogoutError);
            expect(forceLogout).toHaveBeenCalledWith('server1', forceLogoutError);
        });
    });

    it('hostRemove', async () => {
        await act(async () => {
            // Test successful case
            const successResult = await CallsActions.hostRemove('server1', 'call1', 'session1');
            expect(successResult).toBe(undefined);
            expect(mockClient.hostRemove).toHaveBeenCalledWith('call1', 'session1');

            // Test error case
            mockClient.hostRemove.mockRejectedValueOnce(forceLogoutError);

            const errorResult = await CallsActions.hostRemove('server1', 'call1', 'session1');
            expect(errorResult).toBe(forceLogoutError);
            expect(forceLogout).toHaveBeenCalledWith('server1', forceLogoutError);
        });
    });

    describe('handleCallsSlashCommand', () => {
        const intl = createIntl({locale: 'en', messages: {}});

        beforeEach(() => {
            jest.clearAllMocks();
            act(() => {
                setCallsState('server1', DefaultCallsState);
                setChannelsWithCalls('server1', {});
                setCurrentCall(null);
                setCallsConfig('server1', DefaultCallsConfig);
            });
        });

        it('should handle non-call commands', async () => {
            const result = await CallsActions.handleCallsSlashCommand('/other command', 'server1', 'channel1', 'O', '', 'user1', intl);
            expect(result).toEqual({handled: false});
        });

        it('should handle /call without subcommand', async () => {
            const result = await CallsActions.handleCallsSlashCommand('/call', 'server1', 'channel1', 'O', '', 'user1', intl);
            expect(result).toEqual({handled: false});
        });

        it('should handle end command', async () => {
            const getCurrentUser = require('@queries/servers/user').getCurrentUser;
            getCurrentUser.mockResolvedValueOnce({
                id: 'user1',
                roles: 'system_admin',
            });

            jest.spyOn(Alert, 'alert');

            await CallsActions.handleCallsSlashCommand('/call end', 'server1', 'channel1', 'O', '', 'user1', intl);
            expect(Alert.alert).toHaveBeenCalled();
        });

        it('should handle start command in DM', async () => {
            const result = await CallsActions.handleCallsSlashCommand('/call start Test Call', 'server1', 'channel1', 'D', 'root1', 'user1', intl);
            expect(result).toEqual({handled: true});
        });

        it('should handle start command with group calls disabled', async () => {
            act(() => {
                setCallsConfig('server1', {...DefaultCallsConfig, DefaultEnabled: false, AllowEnableCalls: false});
            });

            const result = await CallsActions.handleCallsSlashCommand('/call start', 'server1', 'channel1', 'O', '', 'user1', intl);
            expect(result.error).toBeDefined();
            expect(result.handled).toBeUndefined();
        });

        it('should handle start command with existing call', async () => {
            act(() => {
                setChannelsWithCalls('server1', {channel1: true});
            });

            const result = await CallsActions.handleCallsSlashCommand('/call start', 'server1', 'channel1', 'O', '', 'user1', intl);
            expect(result.error).toBeDefined();
            expect(result.handled).toBeUndefined();
        });

        it('should handle join command', async () => {
            const result = await CallsActions.handleCallsSlashCommand('/call join Test Call', 'server1', 'channel1', 'D', 'root1', 'user1', intl);
            expect(result).toEqual({handled: true});
        });

        it('should handle leave command when in call', async () => {
            act(() => {
                newCurrentCall('server1', 'channel1', 'user1');
            });

            const result = await CallsActions.handleCallsSlashCommand('/call leave', 'server1', 'channel1', 'O', '', 'user1', intl);
            expect(result).toEqual({handled: true});
        });

        it('should handle leave command when not in call', async () => {
            const result = await CallsActions.handleCallsSlashCommand('/call leave', 'server1', 'channel1', 'O', '', 'user1', intl);
            expect(result.error).toBeDefined();
            expect(result.handled).toBeUndefined();
        });

        describe('recording commands', () => {
            beforeEach(() => {
                act(() => {
                    newCurrentCall('server1', 'channel1', 'user1');
                });
            });

            describe('handleEndCall', () => {
                beforeEach(() => {
                    jest.spyOn(Alert, 'alert');
                });

                afterEach(() => {
                    jest.clearAllMocks();
                });

                it('should show error when user lacks permission', async () => {
                    const getCurrentUser = require('@queries/servers/user').getCurrentUser;
                    getCurrentUser.mockResolvedValueOnce({
                        id: 'user2',
                        roles: 'user',
                    });

                    act(() => {
                        State.setCallsState('server1', {
                            myUserId: 'user2',
                            calls: {
                                channel1: {
                                    hostId: 'user1',
                                } as Call,
                            },
                            enabled: {},
                        });
                    });

                    await CallsActions.handleCallsSlashCommand('/call end', 'server1', 'channel1', 'O', '', 'user2', intl);

                    expect(Alert.alert).toHaveBeenCalledWith(
                        'Error',
                        'You don\'t have permission to end the call. Please ask the call host to end the call.',
                    );
                    expect(mockClient.endCall).not.toHaveBeenCalled();
                });

                it('should end call when user has permission', async () => {
                    const getCurrentUser = require('@queries/servers/user').getCurrentUser;
                    getCurrentUser.mockResolvedValueOnce({
                        id: 'user1',
                        roles: 'system_admin',
                    });

                    const getChannelById = require('@queries/servers/channel').getChannelById;
                    getChannelById.mockResolvedValueOnce({
                        id: 'channel1',
                        type: 'O',
                        displayName: 'Test Channel',
                    });

                    act(() => {
                        State.setCallsState('server1', {
                            myUserId: 'user1',
                            calls: {
                                channel1: {
                                    id: 'call1',
                                    sessions: {
                                        session1: {
                                            sessionId: 'session1',
                                            userId: 'user1',
                                            muted: false,
                                            raisedHand: 0,
                                        },
                                        session2: {
                                            sessionId: 'session2',
                                            userId: 'user2',
                                            muted: true,
                                            raisedHand: 0,
                                        },
                                    },
                                    channelId: 'channel1',
                                    startTime: (new Date()).getTime(),
                                    screenOn: '',
                                    threadId: 'abcd1234567',
                                    ownerId: 'xohi8cki9787fgiryne716u84o',
                                    hostId: 'xohi8cki9787fgiryne716u84o',
                                    dismissed: {},
                                },
                            },
                            enabled: {},
                        });
                    });

                    await CallsActions.handleCallsSlashCommand('/call end', 'server1', 'channel1', 'O', '', 'user1', intl);

                    // Get the callback from the second button
                    const alertCallback = (Alert.alert as jest.Mock).mock.calls[0][2][1].onPress;
                    await alertCallback();

                    expect(Alert.alert).toHaveBeenCalled();
                    expect(mockClient.endCall).toHaveBeenCalledWith('channel1');
                });
            });

            it('should handle recording without action', async () => {
                const result = await CallsActions.handleCallsSlashCommand('/call recording', 'server1', 'channel1', 'O', '', 'user1', intl);
                expect(result).toEqual({handled: false});
            });

            it('should handle recording start when already recording', async () => {
                act(() => {
                    setCurrentCall({
                        ...getCurrentCall()!,
                        recState: {
                            init_at: 1,
                            start_at: 2,
                            end_at: 1,
                        } as CallJobState,
                    });
                });

                const result = await CallsActions.handleCallsSlashCommand('/call recording start', 'server1', 'channel1', 'O', '', 'user1', intl);
                expect(result.error).toBeDefined();
                expect(result.handled).toBeUndefined();
            });

            it('should handle recording start without host permission', async () => {
                act(() => {
                    setCurrentCall({
                        ...getCurrentCall()!,
                        hostId: 'other_user',
                    });
                });

                const result = await CallsActions.handleCallsSlashCommand('/call recording start', 'server1', 'channel1', 'O', '', 'user1', intl);
                expect(result.error).toBeDefined();
                expect(result.handled).toBeUndefined();
            });

            it('should handle recording start as host', async () => {
                act(() => {
                    setCurrentCall({
                        ...getCurrentCall()!,
                        hostId: 'user1',
                    });
                });

                const result = await CallsActions.handleCallsSlashCommand('/call recording start', 'server1', 'channel1', 'O', '', 'user1', intl);
                expect(result).toEqual({handled: true});
                expect(mockClient.startCallRecording).toHaveBeenCalled();
            });

            it('should handle recording stop when not recording', async () => {
                const result = await CallsActions.handleCallsSlashCommand('/call recording stop', 'server1', 'channel1', 'O', '', 'user1', intl);
                expect(result.error).toBeDefined();
                expect(result.handled).toBeUndefined();
            });

            it('should handle recording stop without host permission', async () => {
                act(() => {
                    setCurrentCall({
                        ...getCurrentCall()!,
                        hostId: 'other_user',
                        recState: {
                            init_at: 1,
                            start_at: 2,
                            end_at: 1,
                        } as CallJobState,
                    });
                });

                const result = await CallsActions.handleCallsSlashCommand('/call recording stop', 'server1', 'channel1', 'O', '', 'user1', intl);
                expect(result.error).toBeDefined();
                expect(result.handled).toBeUndefined();
            });

            it('should handle recording stop as host', async () => {
                act(() => {
                    setCurrentCall({
                        ...getCurrentCall()!,
                        hostId: 'user1',
                        recState: {
                            init_at: 1,
                            start_at: 2,
                            end_at: 1,
                        } as CallJobState,
                    });
                });

                const result = await CallsActions.handleCallsSlashCommand('/call recording stop', 'server1', 'channel1', 'O', '', 'user1', intl);
                expect(result).toEqual({handled: true});
                expect(mockClient.stopCallRecording).toHaveBeenCalled();
            });
        });
    });

    it('loadCallForChannel', async () => {
        const {result} = renderHook(() => {
            return [useCallsState('server1'), useChannelsWithCalls('server1')];
        });

        // Test successful case
        await act(async () => {
            mockClient.getCallForChannel.mockReturnValueOnce({
                call: {
                    channel_id: 'channel-1',
                    sessions: [
                        {
                            session_id: 'session-1',
                            user_id: 'user-1',
                            unmuted: false,
                            raised_hand: 0,
                        },
                    ],
                },
                enabled: true});
            const successResult = await CallsActions.loadCallForChannel('server1', 'channel-1');
            expect(successResult.data).toBeDefined();
            expect(mockClient.getCallForChannel).toHaveBeenCalled();
            assert.equal((result.current[0].calls as Dictionary<Call>)['channel-1'].channelId, 'channel-1');
            assert.equal((result.current[0].enabled as Dictionary<boolean>)['channel-1'], true);
        });

        // Test error case
        mockClient.getCallForChannel.mockRejectedValueOnce(forceLogoutError);

        await act(async () => {
            const errorResult = await CallsActions.loadCallForChannel('server1', 'channel-1');
            expect(errorResult.error).toBe(forceLogoutError);
            expect(forceLogout).toHaveBeenCalledWith('server1', forceLogoutError);
        });
    });

    it('loadConfigAndCalls', async () => {
        // Test successful case - plugin enabled
        const successResult = await CallsActions.loadConfigAndCalls('server1', 'user1');
        expect(successResult).toBeUndefined();
        expect(mockClient.getPluginsManifests).toHaveBeenCalled();
        expect(mockClient.getCallsConfig).toHaveBeenCalledTimes(1);
        expect(mockClient.getCalls).toHaveBeenCalledTimes(1);

        // Test when plugin is disabled
        mockClient.getPluginsManifests.mockReturnValueOnce([{id: 'other-plugin'}]);
        const disabledResult = await CallsActions.loadConfigAndCalls('server1', 'user1');
        expect(disabledResult).toBeUndefined();
        expect(mockClient.getCallsConfig).toHaveBeenCalledTimes(1);
        expect(mockClient.getCalls).toHaveBeenCalledTimes(1);
    });

    it('checkIsCallsPluginEnabled', async () => {
        // Test successful case - plugin enabled
        const successResult = await CallsActions.checkIsCallsPluginEnabled('server1');
        expect(successResult.data).toBe(true);
        expect(mockClient.getPluginsManifests).toHaveBeenCalled();

        // Test successful case - plugin disabled
        mockClient.getPluginsManifests.mockReturnValueOnce([{id: 'other-plugin'}]);
        const disabledResult = await CallsActions.checkIsCallsPluginEnabled('server1');
        expect(disabledResult.data).toBe(false);

        // Test error case
        mockClient.getPluginsManifests = jest.fn().mockRejectedValueOnce(forceLogoutError);

        const errorResult = await CallsActions.checkIsCallsPluginEnabled('server1');
        expect(errorResult.error).toBe(forceLogoutError);
        expect(forceLogout).toHaveBeenCalledWith('server1', forceLogoutError);
    });

    it('canEndCall', async () => {
        // Test when server cannot be found.
        const result1 = await CallsActions.canEndCall('server2', 'channel-1');
        expect(result1).toBe(false);

        await act(() => {
            State.setCallsState('server1', {
                myUserId: 'user1',
                calls: {
                    'channel-1': {
                        hostId: 'user1',
                    } as Call,
                },
                enabled: {},
            });
        });

        // Test when current user is system admin
        const getCurrentUser = require('@queries/servers/user').getCurrentUser;
        getCurrentUser.mockResolvedValueOnce({
            id: 'user1',
            roles: 'system_admin',
        });

        const result2 = await CallsActions.canEndCall('server1', 'channel-1');
        expect(result2).toBe(true);

        // Test when current user is call host
        getCurrentUser.mockResolvedValueOnce({
            id: 'user1',
            roles: 'user',
        });

        const result3 = await CallsActions.canEndCall('server1', 'channel-1');
        expect(result3).toBe(true);

        // Test when current user is neither admin nor host
        getCurrentUser.mockResolvedValueOnce({
            id: 'user2',
            roles: 'user',
        });

        const result4 = await CallsActions.canEndCall('server1', 'channel-1');
        expect(result4).toBe(false);
    });

    it('getEndCallMessage', async () => {
        const intl = createIntl({
            locale: 'en',
            messages: {},
        });

        const getChannelById = require('@queries/servers/channel').getChannelById;
        const getUserById = require('@queries/servers/user').getUserById;
        const getLicense = require('@queries/servers/system').getLicense;
        const getConfig = require('@queries/servers/system').getConfig;
        const queryDisplayNamePreferences = require('@queries/servers/preference').queryDisplayNamePreferences;

        // Test when server cannot be found.
        const result1 = await CallsActions.getEndCallMessage('server2', 'channel-1', 'user1', intl);
        expect(result1).toContain('Are you sure you want to end the call?');

        // Test regular channel
        getChannelById.mockResolvedValueOnce({
            id: 'channel-1',
            type: 'O',
            displayName: 'Test Channel',
        });

        act(() => {
            State.setCallsState('server1', {
                myUserId: 'user1',
                calls: {
                    'channel-1': {
                        id: 'call1',
                        sessions: {
                            session1: {
                                sessionId: 'a23456abcdefghijklmnopqrs',
                                userId: 'xohi8cki9787fgiryne716u84o',
                                muted: false,
                                raisedHand: 0,
                            },
                            session2: {
                                sessionId: 'a12345667890bcdefghijklmn1',
                                userId: 'xohi8cki9787fgiryne716u84o',
                                muted: true,
                                raisedHand: 0,
                            },
                        },
                        channelId: 'channel-1',
                        startTime: (new Date()).getTime(),
                        screenOn: '',
                        threadId: 'abcd1234567',
                        ownerId: 'xohi8cki9787fgiryne716u84o',
                        hostId: 'xohi8cki9787fgiryne716u84o',
                        dismissed: {},
                    },
                },
                enabled: {},
            });
        });

        const result2 = await CallsActions.getEndCallMessage('server1', 'channel-1', 'user1', intl);
        expect(result2).toContain('2 participants');
        expect(result2).toContain('Test Channel');

        act(() => {
            State.setCallsState('server1', {
                myUserId: 'user1',
                calls: {
                    'channel-2': {
                        id: 'call1',
                        sessions: {
                            session1: {
                                sessionId: 'a23456abcdefghijklmnopqrs',
                                userId: 'xohi8cki9787fgiryne716u84o',
                                muted: false,
                                raisedHand: 0,
                            },
                            session2: {
                                sessionId: 'a12345667890bcdefghijklmn1',
                                userId: 'xohi8cki9787fgiryne716u84o',
                                muted: true,
                                raisedHand: 0,
                            },
                        },
                        channelId: 'channel-2',
                        startTime: (new Date()).getTime(),
                        screenOn: '',
                        threadId: 'abcd1234567',
                        ownerId: 'xohi8cki9787fgiryne716u84o',
                        hostId: 'xohi8cki9787fgiryne716u84o',
                        dismissed: {},
                    },
                },
                enabled: {},
            });
        });

        // Test DM channel
        getChannelById.mockResolvedValueOnce({
            id: 'channel-2',
            type: 'D',
            name: 'user1__user2',
            displayName: 'User Two',
        });

        getUserById.mockResolvedValueOnce({
            id: 'user2',
            username: 'user2',
            firstName: 'User',
            lastName: 'Two',
        });

        getLicense.mockResolvedValueOnce({});
        getConfig.mockResolvedValueOnce({
            TeammateNameDisplay: 'username',
        });
        queryDisplayNamePreferences.mockReturnValueOnce({
            fetch: () => Promise.resolve([]),
        });

        const result3 = await CallsActions.getEndCallMessage('server1', 'channel-2', 'user1', intl);
        expect(result3).toBe('Are you sure you want to end the call with user2?');
    });

    it('endCall', async () => {
        // Test successful case
        const successResult = await CallsActions.endCall('server1', 'channel-1');
        expect(successResult).toBe(undefined);
        expect(mockClient.endCall).toHaveBeenCalledWith('channel-1');

        // Test error case
        mockClient.endCall.mockRejectedValueOnce(forceLogoutError);

        await expect(CallsActions.endCall('server1', 'channel-1')).rejects.toBe(forceLogoutError);
        expect(forceLogout).toHaveBeenCalledWith('server1', forceLogoutError);
    });

    it('setPreferredAudioRoute', async () => {
        await CallsActions.setPreferredAudioRoute(AudioDevice.Speakerphone);
        expect(InCallManager.chooseAudioRoute).toHaveBeenCalledWith('SPEAKER_PHONE');
    });

    it('initializeVoiceTrack', async () => {
        renderHook(() => useCurrentCall());
        addFakeCall('server1', 'channel-id');

        await act(async () => {
            await CallsActions.joinCall('server1', 'channel-id', 'myUserId', true, createIntl({
                locale: 'en',
                messages: {},
            }));
            newCurrentCall('server1', 'channel-id', 'myUserId');
        });

        CallsActions.initializeVoiceTrack();
        expect(getConnectionForTesting()?.initializeVoiceTrack).toHaveBeenCalled();
    });

    it('sendReaction', async () => {
        renderHook(() => useCurrentCall());
        addFakeCall('server1', 'channel-id');

        await act(async () => {
            await CallsActions.joinCall('server1', 'channel-id', 'myUserId', true, createIntl({
                locale: 'en',
                messages: {},
            }));
            newCurrentCall('server1', 'channel-id', 'myUserId');
        });

        const emoji = {name: 'smile', unified: '1f604'};
        CallsActions.sendReaction(emoji);
        expect(getConnectionForTesting()?.sendReaction).toHaveBeenCalledWith(emoji);
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
        expect(newConnection).toHaveBeenCalled();
        expect(newConnection.mock.calls[0][1]).toBe('channel-id');
        expect(updateThreadFollowing).toHaveBeenCalled();

        await act(async () => {
            CallsActions.leaveCall(userLeftChannelErr);
        });

        expect(intl.formatMessage).toHaveBeenCalledWith({
            id: 'mobile.calls_user_left_channel_error_title',
            defaultMessage: 'You left the channel',
        });

        expect(intl.formatMessage).toHaveBeenCalledWith({
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
        expect(newConnection).toHaveBeenCalled();
        expect(newConnection.mock.calls[0][1]).toBe('channel-id');
        expect(updateThreadFollowing).toHaveBeenCalled();

        await act(async () => {
            CallsActions.leaveCall(userRemovedFromChannelErr);
        });

        expect(intl.formatMessage).toHaveBeenCalledWith({
            id: 'mobile.calls_user_removed_from_channel_error_title',
            defaultMessage: 'You were removed from channel',
        });

        expect(intl.formatMessage).toHaveBeenCalledWith({
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
        expect(newConnection).toHaveBeenCalled();
        expect(newConnection.mock.calls[0][1]).toBe('channel-id');
        expect(updateThreadFollowing).toHaveBeenCalled();

        await act(async () => {
            CallsActions.leaveCall(new Error('generic error'));
        });

        expect(errorAlert).toHaveBeenCalled();
    });
});
