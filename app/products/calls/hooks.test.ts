// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, renderHook, waitFor} from '@testing-library/react-native';
import {Alert, AppState} from 'react-native';
import Permissions from 'react-native-permissions';
import {of as of$} from 'rxjs';

import {initializeVoiceTrack, openOutgoingCallScreen} from '@calls/actions/calls';
import {leaveAndJoinWithAlert, showLimitRestrictedAlert} from '@calls/alerts';
import {observeIsCallLimitRestricted} from '@calls/observers';
import {
    cancelOutgoingCall,
    getCurrentCall,
    getCallsConfig,
    setMicPermissionsGranted,
    useCallsState,
    useChannelsWithCalls,
    useCurrentCall,
    useGlobalCallsState,
    useIncomingCalls,
} from '@calls/state';
import {General, Preferences, Screens} from '@constants';
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

import {useTryCallsFunction, usePermissionsChecker, useCallsAdjustment, useHostControlsAvailable, useHostMenus, useNavigationHeaderCallButtonForDM} from './hooks';

jest.mock('react-intl', () => ({
    useIntl: jest.fn().mockReturnValue({
        formatMessage: jest.fn(({defaultMessage}) => defaultMessage),
    }),
    defineMessage: (message: unknown) => message,
    defineMessages: (messages: unknown) => messages,
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
    openOutgoingCallScreen: jest.fn(),
}));

jest.mock('@calls/alerts', () => ({
    leaveAndJoinWithAlert: jest.fn(),
    showLimitRestrictedAlert: jest.fn(),
}));

jest.mock('@calls/observers', () => ({
    observeIsCallLimitRestricted: jest.fn(),
}));

jest.mock('@calls/state', () => ({
    cancelOutgoingCall: jest.fn(),
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

    describe('useNavigationHeaderCallButtonForDM', () => {
        const channelId = 'channel1';
        const notLimitRestricted = {limitRestricted: false, maxParticipants: 8, isCloudStarter: false};

        beforeEach(() => {
            (useChannelsWithCalls as jest.Mock).mockReturnValue({});
            (useCurrentCall as jest.Mock).mockReturnValue(null);
            (NetworkManager.getClient as jest.Mock).mockReturnValue({getEnabled: jest.fn().mockResolvedValue(true)});
            jest.mocked(leaveAndJoinWithAlert).mockResolvedValue(true);
            (observeIsCallLimitRestricted as jest.Mock).mockReturnValue(of$(notLimitRestricted));
        });

        it('should return the start call button when there is no call in the channel', () => {
            const {result} = renderHook(() => useNavigationHeaderCallButtonForDM(channelId, General.DM_CHANNEL));

            expect(result.current).toEqual(expect.objectContaining({
                iconName: 'phone',
                accessibilityLabel: 'Start call',
                disabled: false,
                isLoading: false,
                testID: 'channel_header.quick_call.button',
            }));
        });

        it('should return the join call button when a call is ongoing in the channel', () => {
            (useChannelsWithCalls as jest.Mock).mockReturnValue({[channelId]: true});

            const {result} = renderHook(() => useNavigationHeaderCallButtonForDM(channelId, General.DM_CHANNEL));

            expect(result.current).toEqual(expect.objectContaining({
                iconName: 'phone-in-talk',
                accessibilityLabel: 'Join call',
            }));
        });

        it('should return the return to call button when already in this channel call', () => {
            (useChannelsWithCalls as jest.Mock).mockReturnValue({[channelId]: true});
            (useCurrentCall as jest.Mock).mockReturnValue({channelId});

            const {result} = renderHook(() => useNavigationHeaderCallButtonForDM(channelId, General.DM_CHANNEL));

            expect(result.current).toEqual(expect.objectContaining({
                iconName: 'phone-in-talk',
                accessibilityLabel: 'Return to call',
            }));
        });

        it('should return the start call button when in a call in a different channel', () => {
            (useCurrentCall as jest.Mock).mockReturnValue({channelId: 'other-channel'});

            const {result} = renderHook(() => useNavigationHeaderCallButtonForDM(channelId, General.DM_CHANNEL));

            expect(result.current?.iconName).toBe('phone');
        });

        it.each([General.GM_CHANNEL, General.OPEN_CHANNEL, General.PRIVATE_CHANNEL])('should return undefined for %s channels', (channelType) => {
            const {result} = renderHook(() => useNavigationHeaderCallButtonForDM(channelId, channelType as ChannelType));

            expect(result.current).toBeUndefined();
        });

        it('should start the call and open the full screen call view on press', async () => {
            const {result} = renderHook(() => useNavigationHeaderCallButtonForDM(channelId, General.DM_CHANNEL));

            await act(async () => {
                result.current?.onPress();
            });

            expect(openOutgoingCallScreen).toHaveBeenCalledWith('server1', channelId);
            expect(leaveAndJoinWithAlert).toHaveBeenCalledWith(expect.anything(), 'server1', channelId);

            // Already opened up front, so it isn't opened a second time once connected.
            expect(navigateToScreen).not.toHaveBeenCalled();
            expect(cancelOutgoingCall).not.toHaveBeenCalled();
        });

        it('should open the call view on the press itself, without waiting on the server', async () => {
            let resolveEnabled: () => void = () => null;
            (NetworkManager.getClient as jest.Mock).mockReturnValue({
                getEnabled: jest.fn().mockReturnValue(new Promise<boolean>((resolve) => {
                    resolveEnabled = () => resolve(true);
                })),
            });

            const {result} = renderHook(() => useNavigationHeaderCallButtonForDM(channelId, General.DM_CHANNEL));

            act(() => {
                result.current?.onPress();
            });

            expect(openOutgoingCallScreen).toHaveBeenCalledWith('server1', channelId);
            expect(leaveAndJoinWithAlert).not.toHaveBeenCalled();

            await act(async () => {
                resolveEnabled();
            });
        });

        it('should close the call view again when the call cannot be started', async () => {
            jest.mocked(leaveAndJoinWithAlert).mockResolvedValue(false);

            const {result} = renderHook(() => useNavigationHeaderCallButtonForDM(channelId, General.DM_CHANNEL));

            await act(async () => {
                result.current?.onPress();
            });

            expect(openOutgoingCallScreen).toHaveBeenCalled();
            expect(cancelOutgoingCall).toHaveBeenCalledWith('server1', channelId);
        });

        it('should close the call view again when calls is not enabled on the server', async () => {
            (NetworkManager.getClient as jest.Mock).mockReturnValue({getEnabled: jest.fn().mockResolvedValue(false)});

            const {result} = renderHook(() => useNavigationHeaderCallButtonForDM(channelId, General.DM_CHANNEL));

            await act(async () => {
                result.current?.onPress();
            });

            expect(openOutgoingCallScreen).toHaveBeenCalled();
            expect(leaveAndJoinWithAlert).not.toHaveBeenCalled();
            expect(cancelOutgoingCall).toHaveBeenCalledWith('server1', channelId);
        });

        it('should wait until connected to open the call view when joining an existing call', async () => {
            (useChannelsWithCalls as jest.Mock).mockReturnValue({[channelId]: true});

            const {result} = renderHook(() => useNavigationHeaderCallButtonForDM(channelId, General.DM_CHANNEL));

            await act(async () => {
                result.current?.onPress();
            });

            expect(openOutgoingCallScreen).not.toHaveBeenCalled();
            expect(navigateToScreen).toHaveBeenCalledWith(Screens.CALL);
        });

        it('should wait until connected to open the call view when leaving another call for this one', async () => {
            // Switching calls prompts for confirmation first, and leaving the old call would pop
            // the call view straight back off.
            (useCurrentCall as jest.Mock).mockReturnValue({channelId: 'other-channel'});

            const {result} = renderHook(() => useNavigationHeaderCallButtonForDM(channelId, General.DM_CHANNEL));

            await act(async () => {
                result.current?.onPress();
            });

            expect(openOutgoingCallScreen).not.toHaveBeenCalled();
            expect(navigateToScreen).toHaveBeenCalledWith(Screens.CALL);
        });

        it('should navigate to the call screen instead of joining when already in this channel call', async () => {
            (useCurrentCall as jest.Mock).mockReturnValue({channelId});

            const {result} = renderHook(() => useNavigationHeaderCallButtonForDM(channelId, General.DM_CHANNEL));

            await act(async () => {
                result.current?.onPress();
            });

            expect(navigateToScreen).toHaveBeenCalledWith(Screens.CALL);
            expect(leaveAndJoinWithAlert).not.toHaveBeenCalled();
        });

        it('should show the loading state while connecting to the call', async () => {
            let resolveJoin: () => void = () => null;
            jest.mocked(leaveAndJoinWithAlert).mockReturnValue(new Promise<boolean>((resolve) => {
                resolveJoin = () => resolve(true);
            }));

            const {result} = renderHook(() => useNavigationHeaderCallButtonForDM(channelId, General.DM_CHANNEL));

            act(() => {
                result.current?.onPress();
            });

            await waitFor(() => {
                expect(result.current?.isLoading).toBe(true);
            });
            expect(result.current?.disabled).toBe(true);

            await act(async () => {
                resolveJoin();
            });

            expect(result.current?.isLoading).toBe(false);
            expect(result.current?.disabled).toBe(false);
        });

        it('should show the loading state while checking whether calls is enabled', async () => {
            let resolveEnabled: () => void = () => null;
            (NetworkManager.getClient as jest.Mock).mockReturnValue({
                getEnabled: jest.fn().mockReturnValue(new Promise<boolean>((resolve) => {
                    resolveEnabled = () => resolve(true);
                })),
            });

            const {result} = renderHook(() => useNavigationHeaderCallButtonForDM(channelId, General.DM_CHANNEL));

            act(() => {
                result.current?.onPress();
            });

            // The button is busy before joinOrStart runs, so a second press cannot start another call.
            await waitFor(() => {
                expect(result.current?.isLoading).toBe(true);
            });
            expect(result.current?.disabled).toBe(true);
            expect(leaveAndJoinWithAlert).not.toHaveBeenCalled();

            await act(async () => {
                resolveEnabled();
            });

            expect(leaveAndJoinWithAlert).toHaveBeenCalledTimes(1);
            expect(result.current?.isLoading).toBe(false);
            expect(result.current?.disabled).toBe(false);
        });

        it('should show the capacity alert and not join when the call is at the participant limit', async () => {
            const limitRestrictedInfo = {limitRestricted: true, maxParticipants: 8, isCloudStarter: false};
            (observeIsCallLimitRestricted as jest.Mock).mockReturnValue(of$(limitRestrictedInfo));
            (useChannelsWithCalls as jest.Mock).mockReturnValue({[channelId]: true});

            const {result} = renderHook(() => useNavigationHeaderCallButtonForDM(channelId, General.DM_CHANNEL));

            await act(async () => {
                result.current?.onPress();
            });

            expect(showLimitRestrictedAlert).toHaveBeenCalledWith(limitRestrictedInfo, expect.anything());
            expect(leaveAndJoinWithAlert).not.toHaveBeenCalled();
            expect(result.current?.isLoading).toBe(false);
        });

        it('should only join once when the button is pressed twice in quick succession', async () => {
            const {result} = renderHook(() => useNavigationHeaderCallButtonForDM(channelId, General.DM_CHANNEL));

            await act(async () => {
                result.current?.onPress();
                result.current?.onPress();
            });

            expect(leaveAndJoinWithAlert).toHaveBeenCalledTimes(1);
        });

        it('should only navigate once when the return to call button is pressed twice in quick succession', async () => {
            (useCurrentCall as jest.Mock).mockReturnValue({channelId});

            const {result} = renderHook(() => useNavigationHeaderCallButtonForDM(channelId, General.DM_CHANNEL));

            await act(async () => {
                result.current?.onPress();
                result.current?.onPress();
            });

            expect(navigateToScreen).toHaveBeenCalledTimes(1);
        });

        it('should clear the loading state when joining the call rejects', async () => {
            jest.mocked(leaveAndJoinWithAlert).mockRejectedValue(new Error('failed to join'));

            const {result} = renderHook(() => useNavigationHeaderCallButtonForDM(channelId, General.DM_CHANNEL));

            await act(async () => {
                result.current?.onPress();
            });

            await waitFor(() => {
                expect(result.current?.isLoading).toBe(false);
            });
            expect(result.current?.disabled).toBe(false);
            expect(navigateToScreen).not.toHaveBeenCalled();
        });
    });
});
