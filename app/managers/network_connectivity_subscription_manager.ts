// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetInfo, {type NetInfoSubscription} from '@react-native-community/netinfo';
import {AppState, type AppStateStatus, type NativeEventSubscription} from 'react-native';
import {Subscription} from 'rxjs';

import {subscribeActiveServers} from '@database/subscription/servers';

import NetworkConnectivityManager from './network_connectivity_manager';
import NetworkPerformanceManager from './network_performance_manager';
import WebsocketManager from './websocket_manager';

type Server = {
    url: string;
    lastActiveAt: number;
};

class NetworkConnectivitySubscriptionManagerSingleton {
    private appState: AppStateStatus = 'active';
    private isInternetReachable: boolean | null = null;
    private appSubscription: NativeEventSubscription | undefined;
    private netInfoSubscription: NetInfoSubscription | undefined;
    private activeServersUnsubscriber: {unsubscribe: () => void} | undefined;
    private websocketSubscription: Subscription | undefined;
    private performanceSubscription: Subscription | undefined;

    private findMostRecentServer = (servers: Server[]): Server | undefined => {
        return servers?.length ? servers.reduce((a, b) => (b.lastActiveAt > a.lastActiveAt ? b : a)) : undefined;
    };

    private cleanupWebsocketSubscription = (): void => {
        this.websocketSubscription?.unsubscribe();
        this.websocketSubscription = undefined;
    };

    private cleanupPerformanceSubscription = (): void => {
        this.performanceSubscription?.unsubscribe();
        this.performanceSubscription = undefined;
    };

    private handleActiveServersChange = async (servers: Server[]): Promise<void> => {
        this.cleanupWebsocketSubscription();
        this.cleanupPerformanceSubscription();

        const activeServer = this.findMostRecentServer(servers);
        const serverUrl = activeServer?.url;

        if (!serverUrl) {
            NetworkConnectivityManager.setServerConnectionStatus(false, null);
            NetworkConnectivityManager.shutdown();
            return;
        }

        NetworkConnectivityManager.setServerConnectionStatus(true, serverUrl);

        this.websocketSubscription = WebsocketManager.observeWebsocketState(serverUrl).subscribe((websocketState) => {
            NetworkConnectivityManager.updateState(
                websocketState,
                {isInternetReachable: this.isInternetReachable},
                this.appState,
            );
        });

        this.performanceSubscription = NetworkPerformanceManager.observePerformanceState(serverUrl).subscribe((performanceState) => {
            NetworkConnectivityManager.updatePerformanceState(performanceState);
        });
    };

    private handleAppStateChange = (newAppState: AppStateStatus): void => {
        const previousAppState = this.appState;
        this.appState = newAppState;

        if (previousAppState === newAppState) {
            return;
        }

        if (newAppState === 'active') {
            if (!this.netInfoSubscription || !this.activeServersUnsubscriber) {
                this.init();
            }
        } else if (previousAppState === 'active') {
            NetworkConnectivityManager.reset();
            this.stop();
        }
    };

    private handleNetInfoChange = (netInfo: {isInternetReachable: boolean | null}): void => {
        this.isInternetReachable = netInfo.isInternetReachable ?? null;
    };

    /**
     * Initializes all network connectivity subscriptions including app state, network info,
     * and active servers. This starts the global connectivity monitoring.
     */
    public init = (): void => {
        if (!this.appSubscription) {
            this.appSubscription = AppState.addEventListener('change', this.handleAppStateChange);
        }

        this.netInfoSubscription?.();
        this.netInfoSubscription = NetInfo.addEventListener(this.handleNetInfoChange);

        this.activeServersUnsubscriber?.unsubscribe?.();
        this.activeServersUnsubscriber = subscribeActiveServers(this.handleActiveServersChange);
    };

    private cleanupAllSubscriptions = (): void => {
        this.websocketSubscription?.unsubscribe();
        this.performanceSubscription?.unsubscribe();
        this.activeServersUnsubscriber?.unsubscribe?.();
        this.netInfoSubscription?.();

        this.websocketSubscription = undefined;
        this.performanceSubscription = undefined;
        this.activeServersUnsubscriber = undefined;
        this.netInfoSubscription = undefined;
        this.isInternetReachable = null;
    };

    /**
     * Stops network connectivity subscriptions and cleans up resources.
     * AppState listener persists to handle app lifecycle transitions.
     */
    public stop = (): void => {
        this.cleanupAllSubscriptions();
    };

    /**
     * Completely shuts down all subscriptions including the persistent AppState listener.
     * This should only be called when the app is completely shutting down.
     */
    public shutdown = (): void => {
        this.websocketSubscription?.unsubscribe();
        this.performanceSubscription?.unsubscribe();
        this.activeServersUnsubscriber?.unsubscribe?.();
        this.netInfoSubscription?.();
        this.appSubscription?.remove();

        this.appState = 'active';
        this.isInternetReachable = null;
        this.appSubscription = undefined;
        this.netInfoSubscription = undefined;
        this.activeServersUnsubscriber = undefined;
        this.websocketSubscription = undefined;
        this.performanceSubscription = undefined;
    };
}

const NetworkConnectivitySubscriptionManager = new NetworkConnectivitySubscriptionManagerSingleton();

export const startNetworkConnectivitySubscriptions = (): void => {
    NetworkConnectivitySubscriptionManager.init();
};

export const stopNetworkConnectivitySubscriptions = (): void => {
    NetworkConnectivitySubscriptionManager.stop();
};

export const shutdownNetworkConnectivitySubscriptions = (): void => {
    NetworkConnectivitySubscriptionManager.shutdown();
};

export default NetworkConnectivitySubscriptionManager;

export const testExports = {
    NetworkConnectivitySubscriptionManagerSingleton,
};

