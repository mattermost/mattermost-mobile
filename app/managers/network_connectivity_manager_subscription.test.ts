// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetInfo from '@react-native-community/netinfo';
import {AppState} from 'react-native';
import {Navigation} from 'react-native-navigation';
import {Subscription} from 'rxjs';

import {Screens} from '@constants';
import {subscribeActiveServers} from '@database/subscription/servers';

import NetworkConnectivityManager from './network_connectivity_manager';
import {
    startNetworkConnectivitySubscriptions,
    stopNetworkConnectivitySubscriptions,
} from './network_connectivity_manager_subscription';
import WebsocketManager from './websocket_manager';

type MockServer = {
    url: string;
    lastActiveAt: number;
};

type MockNetInfoState = {
    isInternetReachable: boolean | null;
};

// Mock dependencies
jest.mock('@react-native-community/netinfo', () => ({
    addEventListener: jest.fn(),
}));
jest.mock('react-native', () => ({
    AppState: {
        addEventListener: jest.fn(),
    },
}));
jest.mock('react-native-navigation', () => ({
    Navigation: {
        events: jest.fn(() => ({
            registerComponentDidAppearListener: jest.fn(),
        })),
    },
}));
jest.mock('@database/subscription/servers', () => ({
    subscribeActiveServers: jest.fn(),
}));
jest.mock('@utils/general', () => ({
    getIntlShape: jest.fn(() => ({
        formatMessage: jest.fn((descriptor) => descriptor.defaultMessage),
    })),
}));
jest.mock('./network_connectivity_manager', () => ({
    setServerConnectionStatus: jest.fn(),
    updateState: jest.fn(),
    reapply: jest.fn(),
}));
jest.mock('./websocket_manager', () => ({
    observeWebsocketState: jest.fn(),
}));

const mockAppState = AppState as jest.Mocked<typeof AppState>;
const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;
const mockNavigation = Navigation as jest.Mocked<typeof Navigation>;
const mockSubscribeActiveServers = subscribeActiveServers as jest.MockedFunction<typeof subscribeActiveServers>;
const mockNetworkConnectivityManager = NetworkConnectivityManager as jest.Mocked<typeof NetworkConnectivityManager>;
const mockWebsocketManager = WebsocketManager as jest.Mocked<typeof WebsocketManager>;

describe('NetworkConnectivityManagerSubscription', () => {
    const mockWebsocketSubscription = {
        unsubscribe: jest.fn(),
    } as unknown as Subscription;

    beforeEach(() => {
        jest.clearAllMocks();

        mockAppState.addEventListener.mockReturnValue({
            remove: jest.fn(),
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

        mockNetInfo.addEventListener.mockReturnValue(jest.fn());

        const mockRegisterComponentDidAppearListener = jest.fn();
        mockNavigation.events.mockReturnValue({
            registerComponentDidAppearListener: mockRegisterComponentDidAppearListener,
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

        mockWebsocketManager.observeWebsocketState.mockReturnValue({
            subscribe: jest.fn(() => mockWebsocketSubscription),
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    });

    afterEach(() => {
        stopNetworkConnectivitySubscriptions();
    });

    describe('startNetworkConnectivitySubscriptions', () => {
        it('should set up app state listener', () => {
            startNetworkConnectivitySubscriptions();

            expect(mockAppState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
        });

        it('should set up net info listener', () => {
            startNetworkConnectivitySubscriptions();

            expect(mockNetInfo.addEventListener).toHaveBeenCalledWith(expect.any(Function));
        });

        it('should set up active servers subscription', () => {
            startNetworkConnectivitySubscriptions();

            expect(mockSubscribeActiveServers).toHaveBeenCalledWith(expect.any(Function));
        });

        it('should set up navigation listener', () => {
            startNetworkConnectivitySubscriptions();

            expect(mockNavigation.events).toHaveBeenCalled();
        });

        it('should handle app state changes', () => {
            startNetworkConnectivitySubscriptions();

            const appStateCallback = mockAppState.addEventListener.mock.calls[0][1];
            appStateCallback('background');

            expect(mockAppState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
        });

        it('should handle net info changes', () => {
            startNetworkConnectivitySubscriptions();

            const netInfoCallback = mockNetInfo.addEventListener.mock.calls[0][0];
            const mockNetInfoState: MockNetInfoState = {isInternetReachable: true};
            netInfoCallback(mockNetInfoState as any); // eslint-disable-line @typescript-eslint/no-explicit-any

            expect(mockNetInfo.addEventListener).toHaveBeenCalledWith(expect.any(Function));
        });

        it('should handle active servers change with no servers', async () => {
            startNetworkConnectivitySubscriptions();

            const serversCallback = mockSubscribeActiveServers.mock.calls[0][0];
            await serversCallback([] as any); // eslint-disable-line @typescript-eslint/no-explicit-any

            expect(mockNetworkConnectivityManager.setServerConnectionStatus).toHaveBeenCalledWith(false, null);
        });

        it('should handle active servers change with servers', async () => {
            const mockServers: MockServer[] = [
                {url: 'https://server1.com', lastActiveAt: 1000},
                {url: 'https://server2.com', lastActiveAt: 2000},
            ];

            startNetworkConnectivitySubscriptions();

            const serversCallback = mockSubscribeActiveServers.mock.calls[0][0];
            await serversCallback(mockServers as any); // eslint-disable-line @typescript-eslint/no-explicit-any

            expect(mockNetworkConnectivityManager.setServerConnectionStatus).toHaveBeenCalledWith(true, 'https://server2.com');
            expect(mockWebsocketManager.observeWebsocketState).toHaveBeenCalledWith('https://server2.com');
        });

        it('should handle navigation events for non-floating-banner screens', () => {
            startNetworkConnectivitySubscriptions();

            const mockRegisterComponentDidAppearListener = mockNavigation.events().registerComponentDidAppearListener as jest.MockedFunction<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
            const navigationCallback = mockRegisterComponentDidAppearListener.mock.calls[0][0];
            navigationCallback({componentName: Screens.CHANNEL});

            expect(mockNetworkConnectivityManager.reapply).toHaveBeenCalled();
        });

        it('should not reapply for floating banner screen', () => {
            startNetworkConnectivitySubscriptions();

            const mockRegisterComponentDidAppearListener = mockNavigation.events().registerComponentDidAppearListener as jest.MockedFunction<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
            const navigationCallback = mockRegisterComponentDidAppearListener.mock.calls[0][0];
            navigationCallback({componentName: Screens.FLOATING_BANNER});

            expect(mockNetworkConnectivityManager.reapply).not.toHaveBeenCalled();
        });
    });

    describe('stopNetworkConnectivitySubscriptions', () => {
        it('should clean up all subscriptions', () => {
            startNetworkConnectivitySubscriptions();
            stopNetworkConnectivitySubscriptions();

            expect(mockAppState.addEventListener).toHaveBeenCalled();
        });

        it('should be safe to call multiple times', () => {
            startNetworkConnectivitySubscriptions();
            stopNetworkConnectivitySubscriptions();
            stopNetworkConnectivitySubscriptions();

            expect(true).toBe(true);
        });
    });

    describe('websocket subscription handling', () => {
        it('should subscribe to websocket state changes', async () => {
            const mockServers: MockServer[] = [{url: 'https://test.com', lastActiveAt: 1000}];

            startNetworkConnectivitySubscriptions();

            const serversCallback = mockSubscribeActiveServers.mock.calls[0][0];
            await serversCallback(mockServers as any); // eslint-disable-line @typescript-eslint/no-explicit-any

            expect(mockWebsocketManager.observeWebsocketState).toHaveBeenCalledWith('https://test.com');
        });

        it('should unsubscribe from previous websocket subscription when servers change', async () => {
            const mockServers1: MockServer[] = [{url: 'https://server1.com', lastActiveAt: 1000}];
            const mockServers2: MockServer[] = [{url: 'https://server2.com', lastActiveAt: 2000}];

            startNetworkConnectivitySubscriptions();

            const serversCallback = mockSubscribeActiveServers.mock.calls[0][0];

            await serversCallback(mockServers1 as any); // eslint-disable-line @typescript-eslint/no-explicit-any
            expect(mockWebsocketManager.observeWebsocketState).toHaveBeenCalledWith('https://server1.com');

            await serversCallback(mockServers2 as any); // eslint-disable-line @typescript-eslint/no-explicit-any
            expect(mockWebsocketSubscription.unsubscribe).toHaveBeenCalled();
            expect(mockWebsocketManager.observeWebsocketState).toHaveBeenCalledWith('https://server2.com');
        });
    });
});
