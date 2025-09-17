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
    shutdownNetworkConnectivitySubscriptions,
} from './network_connectivity_subscription_manager';
import NetworkPerformanceManager from './network_performance_manager';
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
    updatePerformanceState: jest.fn(),
    reapply: jest.fn(),
    shutdown: jest.fn(),
}));
jest.mock('./websocket_manager', () => ({
    observeWebsocketState: jest.fn(),
}));
jest.mock('./network_performance_manager', () => ({
    observePerformanceState: jest.fn(),
}));

const mockAppState = AppState as jest.Mocked<typeof AppState>;
const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;
const mockNavigation = Navigation as jest.Mocked<typeof Navigation>;
const mockSubscribeActiveServers = subscribeActiveServers as jest.MockedFunction<typeof subscribeActiveServers>;
const mockNetworkConnectivityManager = NetworkConnectivityManager as jest.Mocked<typeof NetworkConnectivityManager>;
const mockNetworkPerformanceManager = NetworkPerformanceManager as jest.Mocked<typeof NetworkPerformanceManager>;
const mockWebsocketManager = WebsocketManager as jest.Mocked<typeof WebsocketManager>;

describe('NetworkConnectivitySubscriptionManager', () => {
    const mockWebsocketSubscription = {
        unsubscribe: jest.fn(),
    } as unknown as Subscription;

    const mockPerformanceSubscription = {
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

        mockNetworkPerformanceManager.observePerformanceState.mockReturnValue({
            subscribe: jest.fn(() => mockPerformanceSubscription),
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    });

    afterEach(() => {
        shutdownNetworkConnectivitySubscriptions();
    });

    describe('startNetworkConnectivitySubscriptions', () => {
        it('should set up app state listener on first call', () => {
            startNetworkConnectivitySubscriptions();

            expect(mockAppState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
        });

        it('should not recreate app state listener on subsequent calls', () => {
            startNetworkConnectivitySubscriptions();
            mockAppState.addEventListener.mockClear();

            startNetworkConnectivitySubscriptions();

            expect(mockAppState.addEventListener).not.toHaveBeenCalled();
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

        it('should stop subscriptions when going to background and restart when returning to active', () => {
            const mockAppStateListener = {remove: jest.fn()};
            const mockNetInfoUnsubscriber = jest.fn();
            const mockActiveServersUnsubscriber = {unsubscribe: jest.fn()};

            mockAppState.addEventListener.mockReturnValue(mockAppStateListener as any); // eslint-disable-line @typescript-eslint/no-explicit-any
            mockNetInfo.addEventListener.mockReturnValue(mockNetInfoUnsubscriber);
            mockSubscribeActiveServers.mockReturnValue(mockActiveServersUnsubscriber as any); // eslint-disable-line @typescript-eslint/no-explicit-any

            startNetworkConnectivitySubscriptions();

            const appStateCallback = mockAppState.addEventListener.mock.calls[0][1];

            appStateCallback('background');

            expect(mockNetInfoUnsubscriber).toHaveBeenCalled();
            expect(mockActiveServersUnsubscriber.unsubscribe).toHaveBeenCalled();
            expect(mockAppStateListener.remove).not.toHaveBeenCalled();

            mockNetInfo.addEventListener.mockClear();
            mockSubscribeActiveServers.mockClear();

            appStateCallback('active');

            expect(mockNetInfo.addEventListener).toHaveBeenCalled();
            expect(mockSubscribeActiveServers).toHaveBeenCalled();
            expect(mockAppStateListener.remove).not.toHaveBeenCalled();
        });

        it('should not restart subscriptions when app state does not change', () => {
            const mockNetInfoUnsubscriber = jest.fn();
            const mockActiveServersUnsubscriber = {unsubscribe: jest.fn()};

            mockNetInfo.addEventListener.mockReturnValue(mockNetInfoUnsubscriber);
            mockSubscribeActiveServers.mockReturnValue(mockActiveServersUnsubscriber as any); // eslint-disable-line @typescript-eslint/no-explicit-any

            startNetworkConnectivitySubscriptions();

            const appStateCallback = mockAppState.addEventListener.mock.calls[0][1];

            mockNetInfo.addEventListener.mockClear();
            mockSubscribeActiveServers.mockClear();

            appStateCallback('active');

            expect(mockNetInfo.addEventListener).not.toHaveBeenCalled();
            expect(mockSubscribeActiveServers).not.toHaveBeenCalled();
            expect(mockNetInfoUnsubscriber).not.toHaveBeenCalled();
            expect(mockActiveServersUnsubscriber.unsubscribe).not.toHaveBeenCalled();
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
            expect(mockNetworkConnectivityManager.shutdown).toHaveBeenCalled();
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
            expect(mockNetworkPerformanceManager.observePerformanceState).toHaveBeenCalledWith('https://server2.com');
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
        it('should clean up subscriptions but preserve AppState listener', async () => {
            const mockAppStateListener = {remove: jest.fn()};
            const mockNetInfoUnsubscriber = jest.fn();
            const mockActiveServersUnsubscriber = {unsubscribe: jest.fn()};
            const mockWebsocketSubscriptionForCleanup = {unsubscribe: jest.fn()};
            const mockPerformanceSubscriptionForCleanup = {unsubscribe: jest.fn()};

            mockAppState.addEventListener.mockReturnValue(mockAppStateListener as any); // eslint-disable-line @typescript-eslint/no-explicit-any
            mockNetInfo.addEventListener.mockReturnValue(mockNetInfoUnsubscriber);
            mockSubscribeActiveServers.mockReturnValue(mockActiveServersUnsubscriber as any); // eslint-disable-line @typescript-eslint/no-explicit-any
            mockWebsocketManager.observeWebsocketState.mockReturnValue({
                subscribe: jest.fn(() => mockWebsocketSubscriptionForCleanup),
            } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
            mockNetworkPerformanceManager.observePerformanceState.mockReturnValue({
                subscribe: jest.fn(() => mockPerformanceSubscriptionForCleanup),
            } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

            startNetworkConnectivitySubscriptions();

            // Simulate active servers to create websocket subscription
            const serversCallback = mockSubscribeActiveServers.mock.calls[0][0];
            await serversCallback([{url: 'https://test.com', lastActiveAt: 1000}] as any); // eslint-disable-line @typescript-eslint/no-explicit-any

            stopNetworkConnectivitySubscriptions();

            expect(mockAppStateListener.remove).not.toHaveBeenCalled();
            expect(mockNetInfoUnsubscriber).toHaveBeenCalled();
            expect(mockActiveServersUnsubscriber.unsubscribe).toHaveBeenCalled();
            expect(mockWebsocketSubscriptionForCleanup.unsubscribe).toHaveBeenCalled();
            expect(mockPerformanceSubscriptionForCleanup.unsubscribe).toHaveBeenCalled();
        });

        it('should be safe to call multiple times', () => {
            const mockAppStateListener = {remove: jest.fn()};
            const mockNetInfoUnsubscriber = jest.fn();
            const mockActiveServersUnsubscriber = {unsubscribe: jest.fn()};

            mockAppState.addEventListener.mockReturnValue(mockAppStateListener as any); // eslint-disable-line @typescript-eslint/no-explicit-any
            mockNetInfo.addEventListener.mockReturnValue(mockNetInfoUnsubscriber);
            mockSubscribeActiveServers.mockReturnValue(mockActiveServersUnsubscriber as any); // eslint-disable-line @typescript-eslint/no-explicit-any

            startNetworkConnectivitySubscriptions();
            stopNetworkConnectivitySubscriptions();

            // Clear mock call counts
            mockAppStateListener.remove.mockClear();
            mockNetInfoUnsubscriber.mockClear();
            mockActiveServersUnsubscriber.unsubscribe.mockClear();

            // Call stop again - should not throw and should handle gracefully
            expect(() => stopNetworkConnectivitySubscriptions()).not.toThrow();

            // Verify cleanup methods are not called again (they should be no-ops)
            expect(mockAppStateListener.remove).not.toHaveBeenCalled();
            expect(mockNetInfoUnsubscriber).not.toHaveBeenCalled();
            expect(mockActiveServersUnsubscriber.unsubscribe).not.toHaveBeenCalled();
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

    describe('shutdownNetworkConnectivitySubscriptions', () => {
        it('should clean up all subscriptions including AppState listener', async () => {
            const mockAppStateListener = {remove: jest.fn()};
            const mockNetInfoUnsubscriber = jest.fn();
            const mockActiveServersUnsubscriber = {unsubscribe: jest.fn()};
            const mockWebsocketSubscriptionForCleanup = {unsubscribe: jest.fn()};
            const mockPerformanceSubscriptionForCleanup = {unsubscribe: jest.fn()};

            mockAppState.addEventListener.mockReturnValue(mockAppStateListener as any); // eslint-disable-line @typescript-eslint/no-explicit-any
            mockNetInfo.addEventListener.mockReturnValue(mockNetInfoUnsubscriber);
            mockSubscribeActiveServers.mockReturnValue(mockActiveServersUnsubscriber as any); // eslint-disable-line @typescript-eslint/no-explicit-any

            mockWebsocketManager.observeWebsocketState.mockReturnValue({
                subscribe: jest.fn(() => mockWebsocketSubscriptionForCleanup),
            } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

            mockNetworkPerformanceManager.observePerformanceState.mockReturnValue({
                subscribe: jest.fn(() => mockPerformanceSubscriptionForCleanup),
            } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

            startNetworkConnectivitySubscriptions();

            // Simulate active servers to create websocket subscription
            const serversCallback = mockSubscribeActiveServers.mock.calls[0][0];
            await serversCallback([{url: 'https://test.com', lastActiveAt: 1000}] as any); // eslint-disable-line @typescript-eslint/no-explicit-any

            shutdownNetworkConnectivitySubscriptions();

            expect(mockAppStateListener.remove).toHaveBeenCalled();
            expect(mockNetInfoUnsubscriber).toHaveBeenCalled();
            expect(mockActiveServersUnsubscriber.unsubscribe).toHaveBeenCalled();
            expect(mockWebsocketSubscriptionForCleanup.unsubscribe).toHaveBeenCalled();
            expect(mockPerformanceSubscriptionForCleanup.unsubscribe).toHaveBeenCalled();
        });
    });
});
