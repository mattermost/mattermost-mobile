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
import WebsocketManager from './websocket_manager';

let latestAppState: AppStateStatus = 'active';
let latestReachable: boolean | null = null;
const intl = getIntlShape();

let appSub: NativeEventSubscription | undefined;
let netSub: NetInfoSubscription | undefined;
let activeServersUnsub: {unsubscribe: () => void} | undefined;
let wsSub: Subscription | undefined;

export const startNetworkConnectivitySubscriptions = () => {
    // App state tracking
    appSub?.remove();
    appSub = AppState.addEventListener('change', (s) => {
        latestAppState = s;
    });

    // Net info tracking
    netSub?.();
    netSub = NetInfo.addEventListener((s) => {
        latestReachable = s.isInternetReachable ?? null;
    });

    // Active server subscription → resubscribe websocket stream per active server
    activeServersUnsub?.unsubscribe?.();
    activeServersUnsub = subscribeActiveServers(async (servers) => {
        // Always clean previous websocket subscription
        wsSub?.unsubscribe();
        wsSub = undefined;

        const active = servers?.length ? servers.reduce((a, b) => (b.lastActiveAt > a.lastActiveAt ? b : a)) : undefined;
        const serverUrl: string | undefined = active?.url;

        if (!serverUrl) {
            NetworkConnectivityManager.setServerConnectionStatus(false, null);
            return;
        }

        NetworkConnectivityManager.setServerConnectionStatus(true, serverUrl);

        wsSub = WebsocketManager.observeWebsocketState(serverUrl).subscribe((state) => {
            NetworkConnectivityManager.updateState(
                state,
                {isInternetReachable: latestReachable},
                latestAppState,
                intl.formatMessage,
            );
        });
    });

    // If navigation changes root or pushes a new screen and overlays are implicitly dismissed,
    // re-evaluate and show the overlay again if conditions still apply.
    Navigation.events().registerComponentDidAppearListener((event) => {
        if (event.componentName === Screens.FLOATING_BANNER) {
            return;
        }
        NetworkConnectivityManager.reapply();
    });
};

export const stopNetworkConnectivitySubscriptions = () => {
    wsSub?.unsubscribe();
    wsSub = undefined;
    activeServersUnsub?.unsubscribe?.();
    activeServersUnsub = undefined;
    netSub?.();
    netSub = undefined;
    appSub?.remove();
    appSub = undefined;
};

