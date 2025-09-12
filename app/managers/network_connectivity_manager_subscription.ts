// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetInfo, {type NetInfoSubscription} from '@react-native-community/netinfo';
import {AppState, type AppStateStatus, type NativeEventSubscription} from 'react-native';
import {Navigation} from 'react-native-navigation';
import {Subscription} from 'rxjs';

import {Screens} from '@constants';
import {subscribeActiveServers} from '@database/subscription/servers';
import {getIntlShape} from '@utils/general';

import NetworkConnectivityManager from './network_connectivity_manager';
import NetworkPerformanceManager from './network_performance_manager';
import WebsocketManager from './websocket_manager';

type Server = {
    url: string;
    lastActiveAt: number;
};

type SubscriptionState = {
    appState: AppStateStatus;
    isInternetReachable: boolean | null;
    appSubscription: NativeEventSubscription | undefined;
    netInfoSubscription: NetInfoSubscription | undefined;
    activeServersUnsubscriber: {unsubscribe: () => void} | undefined;
    websocketSubscription: Subscription | undefined;
    performanceSubscription: Subscription | undefined;
};

const initialState: SubscriptionState = {
    appState: 'active',
    isInternetReachable: null,
    appSubscription: undefined,
    netInfoSubscription: undefined,
    activeServersUnsubscriber: undefined,
    websocketSubscription: undefined,
    performanceSubscription: undefined,
};

let state = {...initialState};
const intl = getIntlShape();

const findMostRecentServer = (servers: Server[]): Server | undefined => {
    return servers?.length ? servers.reduce((a, b) => (b.lastActiveAt > a.lastActiveAt ? b : a)) : undefined;
};

const cleanupWebsocketSubscription = (): void => {
    state.websocketSubscription?.unsubscribe();
    state.websocketSubscription = undefined;
};

const cleanupPerformanceSubscription = (): void => {
    state.performanceSubscription?.unsubscribe();
    state.performanceSubscription = undefined;
};

const handleActiveServersChange = async (servers: Server[]): Promise<void> => {
    cleanupWebsocketSubscription();
    cleanupPerformanceSubscription();

    const activeServer = findMostRecentServer(servers);
    const serverUrl = activeServer?.url;

    if (!serverUrl) {
        NetworkConnectivityManager.setServerConnectionStatus(false, null);
        return;
    }

    NetworkConnectivityManager.setServerConnectionStatus(true, serverUrl);

    state.websocketSubscription = WebsocketManager.observeWebsocketState(serverUrl).subscribe((websocketState) => {
        NetworkConnectivityManager.updateState(
            websocketState,
            {isInternetReachable: state.isInternetReachable},
            state.appState,
            intl.formatMessage,
        );
    });

    state.performanceSubscription = NetworkPerformanceManager.observePerformanceState(serverUrl).subscribe((performanceState) => {
        NetworkConnectivityManager.updatePerformanceState(performanceState, intl.formatMessage);
    });
};

const handleAppStateChange = (newAppState: AppStateStatus): void => {
    state.appState = newAppState;
};

const handleNetInfoChange = (netInfo: {isInternetReachable: boolean | null}): void => {
    state.isInternetReachable = netInfo.isInternetReachable ?? null;
};

const handleNavigationEvent = (event: {componentName: string}): void => {
    if (event.componentName === Screens.FLOATING_BANNER) {
        return;
    }
    NetworkConnectivityManager.reapply();
};

/**
 * Starts all network connectivity subscriptions including app state, network info,
 * active servers, and navigation events. This initializes the global connectivity monitoring.
 */
export const startNetworkConnectivitySubscriptions = (): void => {
    state.appSubscription?.remove();
    state.appSubscription = AppState.addEventListener('change', handleAppStateChange);

    state.netInfoSubscription?.();
    state.netInfoSubscription = NetInfo.addEventListener(handleNetInfoChange);

    state.activeServersUnsubscriber?.unsubscribe?.();
    state.activeServersUnsubscriber = subscribeActiveServers(handleActiveServersChange);

    Navigation.events().registerComponentDidAppearListener(handleNavigationEvent);
};

const cleanupAllSubscriptions = (): void => {
    state.websocketSubscription?.unsubscribe();
    state.performanceSubscription?.unsubscribe();
    state.activeServersUnsubscriber?.unsubscribe?.();
    state.netInfoSubscription?.();
    state.appSubscription?.remove();

    state = {...initialState};
};

/**
 * Stops all network connectivity subscriptions and cleans up resources.
 * This should be called when the app is shutting down or connectivity monitoring is no longer needed.
 */
export const stopNetworkConnectivitySubscriptions = (): void => {
    cleanupAllSubscriptions();
};

