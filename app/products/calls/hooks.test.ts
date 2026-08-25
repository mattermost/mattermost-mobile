// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, renderHook, waitFor} from '@testing-library/react-native';
import {Alert, AppState, Platform} from 'react-native';
import Permissions, {type PermissionStatus} from 'react-native-permissions';

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
import {Preferences, Screens} from '@constants';
import {
    CURRENT_CALL_BAR_HEIGHT,
    JOIN_CALL_BAR_HEIGHT,
} from '@constants/view';
import {getDefaultThemeByAppearance, useTheme} from '@context/theme';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {queryAllActiveServers} from '@queries/app/servers';
import {getCurrentUser} from '@queries/servers/user';
import {navigateToScreen} from '@screens/navigation';
import {openUserProfile} from '@utils/navigation';

import {useTryCallsFunction, usePermissionsChecker, useCallsAdjustment, useHostControlsAvailable, useHostMenus, resetMicPermissionRequestInProgressForTesting, setMicPermissionRequestInProgressForTesting} from './hooks';

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
    useTheme: jest.fn(),
    getDefaultThemeByAppearance: jest.fn(),
}));
jest.mocked(useTheme).mockReturnValue(Preferences.THEMES.denim);
jest.mocked(getDefaultThemeByAppearance).mockReturnValue(Preferences.THEMES.denim);

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
    navigateToScreen: jest.fn(),
}));
jest.mock('@utils/navigation');

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
            resetMicPermissionRequestInProgressForTesting();
            Object.defineProperty(Platform, 'OS', {value: 'ios', configurable: true});
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

        it('requests permission on iOS when status is DENIED (undetermined)', async () => {
            jest.spyOn(Permissions, 'check').mockResolvedValue(Permissions.RESULTS.DENIED);
            jest.spyOn(Permissions, 'request').mockResolvedValue(Permissions.RESULTS.GRANTED);

            const {result} = renderHook(() => usePermissionsChecker(false));

            await act(async () => {
                AppState.currentState = 'active';
                const callback = (AppState.addEventListener as jest.Mock).mock.calls[0][1];
                await callback('active');
            });

            expect(Permissions.request).toHaveBeenCalled();
            expect(initializeVoiceTrack).toHaveBeenCalled();
            expect(setMicPermissionsGranted).toHaveBeenCalledWith(true);
            expect(result.current).toBe(true);
        });

        it('stays false on iOS when DENIED request is also denied', async () => {
            jest.spyOn(Permissions, 'check').mockResolvedValue(Permissions.RESULTS.DENIED);
            jest.spyOn(Permissions, 'request').mockResolvedValue(Permissions.RESULTS.DENIED);

            const {result} = renderHook(() => usePermissionsChecker(false));

            await act(async () => {
                AppState.currentState = 'active';
                const callback = (AppState.addEventListener as jest.Mock).mock.calls[0][1];
                await callback('active');
            });

            expect(Permissions.request).toHaveBeenCalled();
            expect(initializeVoiceTrack).not.toHaveBeenCalled();
            expect(result.current).toBe(false);
        });

        it('does not request permission on Android when status is DENIED', async () => {
            Object.defineProperty(Platform, 'OS', {value: 'android', configurable: true});
            jest.spyOn(Permissions, 'check').mockResolvedValue(Permissions.RESULTS.DENIED);
            const mockRequest = jest.spyOn(Permissions, 'request');

            const {result} = renderHook(() => usePermissionsChecker(false));

            await act(async () => {
                AppState.currentState = 'active';
                const callback = (AppState.addEventListener as jest.Mock).mock.calls[0][1];
                await callback('active');
            });

            expect(mockRequest).not.toHaveBeenCalled();
            expect(initializeVoiceTrack).not.toHaveBeenCalled();
            expect(result.current).toBe(false);
        });

        it('does not request permission when status is BLOCKED', async () => {
            Object.defineProperty(Platform, 'OS', {value: 'ios', configurable: true});
            jest.spyOn(Permissions, 'check').mockResolvedValue(Permissions.RESULTS.BLOCKED);
            const mockRequest = jest.spyOn(Permissions, 'request');

            renderHook(() => usePermissionsChecker(false));

            await act(async () => {
                AppState.currentState = 'active';
                const callback = (AppState.addEventListener as jest.Mock).mock.calls[0][1];
                await callback('active');
            });

            expect(mockRequest).not.toHaveBeenCalled();
            expect(initializeVoiceTrack).not.toHaveBeenCalled();
        });

        it('skips request if app backgrounded while Permissions.check was in-flight', async () => {
            let resolveCheck: (v: PermissionStatus) => void;
            jest.spyOn(Permissions, 'check').mockReturnValue(
                new Promise((res) => {
                    resolveCheck = res;
                }),
            );
            const mockRequest = jest.spyOn(Permissions, 'request');

            renderHook(() => usePermissionsChecker(false));

            // Trigger active state — asyncFn starts, check() is now in-flight.
            await act(async () => {
                AppState.currentState = 'active';
                const callback = (AppState.addEventListener as jest.Mock).mock.calls[0][1];
                await callback('active');
            });

            // Simulate app going to background while check() is still pending.
            // This fires the effect cleanup (isActive = false).
            await act(async () => {
                const callback = (AppState.addEventListener as jest.Mock).mock.calls[0][1];
                await callback('background');
            });

            // Resolve check() after the effect cleanup ran — asyncFn sees isActive=false and skips request.
            await act(async () => {
                resolveCheck!(Permissions.RESULTS.DENIED);
            });

            expect(mockRequest).not.toHaveBeenCalled();
        });

        it('skips request when micPermissionRequestInProgress guard is set', async () => {
            jest.spyOn(Permissions, 'check').mockImplementation(async () => {
                AppState.currentState = 'active';
                return Permissions.RESULTS.DENIED;
            });
            const mockRequest = jest.spyOn(Permissions, 'request').mockResolvedValue(Permissions.RESULTS.GRANTED);

            // Simulate a concurrent hook instance that has already set the guard.
            setMicPermissionRequestInProgressForTesting(true);

            const {unmount} = renderHook(() => usePermissionsChecker(false));

            await act(async () => {
                AppState.currentState = 'active';
                const callback = (AppState.addEventListener as jest.Mock).mock.calls[0][1];
                await callback('active');
            });

            // Guard was already set, so this instance must not call request.
            expect(mockRequest).not.toHaveBeenCalled();
            unmount();
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

            const {result} = renderHook(() => useHostControlsAvailable());
            await waitFor(() => expect(result.current).toBe(true));
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

            expect(navigateToScreen).toHaveBeenCalledWith(Screens.CALL_HOST_CONTROLS, {sessionId: 'session1'});
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

            expect(openUserProfile).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: mockSession.userId,
                }),
            );
        });
    });
});
