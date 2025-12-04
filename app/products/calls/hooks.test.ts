// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, renderHook} from '@testing-library/react-hooks';
import {Alert, AppState} from 'react-native';
import Permissions from 'react-native-permissions';

import {initializeVoiceTrack} from '@calls/actions/calls';
import {
    getCurrentCall,
    getCallsConfig,
    setMicPermissionsGranted,
    useCallsState,
    useChannelsWithCalls,
    useCurrentCall,
    useGlobalCallsState,
    useIncomingCalls,
} from '@calls/state';
import {Screens} from '@constants';
import {
    CURRENT_CALL_BAR_HEIGHT,
    JOIN_CALL_BAR_HEIGHT,
} from '@constants/view';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {queryAllActiveServers} from '@queries/app/servers';
import {getCurrentUser} from '@queries/servers/user';
import {openUserProfileModal, openAsBottomSheet} from '@screens/navigation';

import {useTryCallsFunction, usePermissionsChecker, useCallsAdjustment, useHostControlsAvailable, useHostMenus} from './hooks';

jest.mock('react-intl', () => ({
    useIntl: jest.fn().mockReturnValue({
        formatMessage: jest.fn(({defaultMessage}) => defaultMessage),
    }),
    defineMessage: (message: any) => message,
    defineMessages: (messages: any) => messages,
}));

jest.mock('@context/server', () => ({
    useServerUrl: jest.fn(() => 'server1'),
}));

jest.mock('@context/theme', () => ({
    useTheme: jest.fn(() => ({})),
}));

jest.mock('@calls/actions/calls', () => ({
    initializeVoiceTrack: jest.fn(),
}));

jest.mock('@calls/state', () => ({
    getCurrentCall: jest.fn(),
    getCallsConfig: jest.fn(),
    setMicPermissionsGranted: jest.fn(),
    useCallsState: jest.fn(),
    useChannelsWithCalls: jest.fn(),
    useCurrentCall: jest.fn(),
    useGlobalCallsState: jest.fn(),
    useIncomingCalls: jest.fn(),
}));

jest.mock('@managers/network_manager', () => ({
    getClient: jest.fn(),
}));

jest.mock('@queries/app/servers', () => ({
    queryAllActiveServers: jest.fn(),
}));

jest.mock('@queries/servers/user', () => ({
    getCurrentUser: jest.fn(),
}));

jest.mock('@screens/navigation', () => ({
    openAsBottomSheet: jest.fn(),
    openUserProfileModal: jest.fn(),
}));

describe('Calls Hooks', () => {
    beforeAll(async () => {
        await DatabaseManager.init(['server1']);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('useTryCallsFunction', () => {
        const mockFn = jest.fn();
        const mockClient = {
            getEnabled: jest.fn(),
        };

        beforeEach(() => {
            (NetworkManager.getClient as jest.Mock).mockReturnValue(mockClient);
        });

        it('executes function when calls enabled', async () => {
            mockClient.getEnabled.mockResolvedValue(true);
            const {result} = renderHook(() => useTryCallsFunction(mockFn));
            const [tryFn] = result.current;

            await act(async () => {
                await tryFn();
            });

            expect(mockFn).toHaveBeenCalled();
        });

        it('shows alert when calls not enabled', async () => {
            mockClient.getEnabled.mockResolvedValue(false);
            const mockAlert = jest.spyOn(Alert, 'alert');
            const {result} = renderHook(() => useTryCallsFunction(mockFn));
            const [tryFn] = result.current;

            await act(async () => {
                await tryFn();
            });

            expect(mockFn).not.toHaveBeenCalled();
            expect(mockAlert).toHaveBeenCalled();
        });
    });

    describe('usePermissionsChecker', () => {
        beforeEach(() => {
            jest.spyOn(AppState, 'addEventListener');
        });

        it('checks permissions when not granted', async () => {
            const mockCheck = jest.spyOn(Permissions, 'check').mockResolvedValue(Permissions.RESULTS.GRANTED);
            const {result} = renderHook(() => usePermissionsChecker(false));

            expect(result.current).toBe(false);

            // Simulate app becoming active
            await act(async () => {
                AppState.currentState = 'active';
                const callback = (AppState.addEventListener as jest.Mock).mock.calls[0][1];
                await callback('active');
            });

            expect(mockCheck).toHaveBeenCalled();
            expect(initializeVoiceTrack).toHaveBeenCalled();
            expect(setMicPermissionsGranted).toHaveBeenCalledWith(true);
            expect(result.current).toBe(true);
        });

        it('skips check when already granted', () => {
            const mockCheck = jest.spyOn(Permissions, 'check');
            renderHook(() => usePermissionsChecker(true));
            expect(mockCheck).not.toHaveBeenCalled();
        });
    });

    describe('useCallsAdjustment', () => {
        beforeEach(() => {
            (useIncomingCalls as jest.Mock).mockReturnValue({incomingCalls: []});
            (useChannelsWithCalls as jest.Mock).mockReturnValue({});
            (useCallsState as jest.Mock).mockReturnValue({calls: {}, myUserId: 'user1'});
            (useGlobalCallsState as jest.Mock).mockReturnValue({micPermissionsGranted: true});
            (useCurrentCall as jest.Mock).mockReturnValue(null);
            (queryAllActiveServers as jest.Mock).mockReturnValue({
                fetch: () => Promise.resolve([{id: 'server1'}]),
            });
        });

        it('calculates adjustment with no calls', () => {
            const {result} = renderHook(() => useCallsAdjustment('server1', 'channel1'));
            expect(result.current).toBe(0);
        });

        it('includes current call bar height', () => {
            (useCurrentCall as jest.Mock).mockReturnValue({id: 'call1', channelId: 'channel1'});
            const {result} = renderHook(() => useCallsAdjustment('server1', 'channel1'));
            expect(result.current).toBe(CURRENT_CALL_BAR_HEIGHT + 8);
        });

        it('includes join call banner height', () => {
            (useChannelsWithCalls as jest.Mock).mockReturnValue({channel1: true});
            const {result} = renderHook(() => useCallsAdjustment('server1', 'channel1'));
            expect(result.current).toBe(JOIN_CALL_BAR_HEIGHT + 8);
        });
    });

    describe('useHostControlsAvailable', () => {
        beforeEach(() => {
            (getCallsConfig as jest.Mock).mockReturnValue({
                HostControlsAllowed: true,
            });
            (getCurrentUser as jest.Mock).mockResolvedValue({
                roles: 'system_user',
            });
        });

        it('returns true for host', async () => {
            (getCurrentCall as jest.Mock).mockReturnValueOnce({
                serverUrl: 'server1',
                myUserId: 'user1',
                hostId: 'user1',
            });

            const {result} = renderHook(() => useHostControlsAvailable());
            expect(result.current).toBe(true);
        });

        it('returns true for admin', async () => {
            (getCurrentCall as jest.Mock).mockReturnValueOnce({
                serverUrl: 'server1',
                myUserId: 'user1',
                hostId: 'host1',
            });

            (getCurrentUser as jest.Mock).mockResolvedValueOnce({
                roles: 'system_admin',
            });

            const {result, waitForNextUpdate} = renderHook(() => useHostControlsAvailable());
            await waitForNextUpdate();
            expect(result.current).toBe(true);
        });
    });

    describe('useHostMenus', () => {
        const mockSession = {
            userId: 'user1',
            sessionId: 'session1',
            muted: false,
            raisedHand: 0,
        };

        beforeEach(() => {
            (useCurrentCall as jest.Mock).mockReturnValue({
                myUserId: 'user1',
                hostId: 'host1',
            });
            (getCallsConfig as jest.Mock).mockReturnValue({
                HostControlsAllowed: true,
            });
        });

        it('opens host controls when admin', async () => {
            (getCurrentUser as jest.Mock).mockResolvedValueOnce({
                roles: 'system_admin',
            });

            const {result} = renderHook(() => useHostMenus());

            await act(async () => {
                await result.current.onPress(mockSession)();
            });

            expect(openAsBottomSheet).toHaveBeenCalledWith(expect.objectContaining({
                screen: Screens.CALL_HOST_CONTROLS,
            }));
        });

        it('opens host controls when host and clicking another profile', async () => {
            (useCurrentCall as jest.Mock).mockReturnValue({
                myUserId: 'user1',
                hostId: 'user1',
            });

            const {result} = renderHook(() => useHostMenus());

            await act(async () => {
                await result.current.onPress(mockSession)();
            });

            expect(openUserProfileModal).toHaveBeenCalledWith(
                expect.any(Object),
                expect.any(Object),
                expect.objectContaining({
                    userId: mockSession.userId,
                }),
            );
        });
    });
});
