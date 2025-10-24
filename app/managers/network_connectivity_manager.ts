// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import ConnectionBanner from '@components/connection_banner/connection_banner';
import {toMilliseconds} from '@utils/datetime';
import {getIntlShape} from '@utils/general';

import {BannerManager} from './banner_manager';

import type {NetworkPerformanceState} from './network_performance_manager';
import type {FloatingBannerConfig} from '@components/floating_banner/types';

const RECONNECTION_BANNER_DURATION = toMilliseconds({seconds: 3});
const PERFORMANCE_BANNER_DURATION = toMilliseconds({seconds: 10});
const NETWORK_STATUS_BANNER_ID = 'network-status';

function getConnectionMessageText(
    websocketState: WebsocketConnectedState,
    isInternetReachable: boolean | null,
    formatMessage: (descriptor: {id: string; defaultMessage: string}) => string,
): string {
    const isConnected = websocketState === 'connected';

    if (isConnected) {
        return formatMessage({id: 'connection_banner.connected', defaultMessage: 'Connection restored'});
    }

    if (websocketState === 'connecting') {
        return formatMessage({id: 'connection_banner.connecting', defaultMessage: 'Connecting...'});
    }

    if (isInternetReachable) {
        return formatMessage({id: 'connection_banner.not_reachable', defaultMessage: 'The server is not reachable'});
    }

    return formatMessage({id: 'connection_banner.not_connected', defaultMessage: 'Unable to connect to network'});
}

function isReconnection(
    previousWebsocketState: WebsocketConnectedState | null,
    isOnAppStart: boolean,
): boolean {
    return previousWebsocketState !== 'connected' && !isOnAppStart;
}

function shouldShowDisconnectedBanner(
    websocketState: WebsocketConnectedState | null,
    isOnAppStart: boolean,
): boolean {
    return websocketState === 'not_connected' && !isOnAppStart;
}

function shouldShowConnectingBanner(
    websocketState: WebsocketConnectedState | null,
    isOnAppStart: boolean,
): boolean {
    return websocketState === 'connecting' && !isOnAppStart;
}

function shouldShowPerformanceBanner(
    performanceState: NetworkPerformanceState | null,
    suppressPerformanceBanner: boolean,
): boolean {
    return performanceState === 'slow' && !suppressPerformanceBanner;
}

function shouldShowReconnectionBanner(
    websocketState: WebsocketConnectedState | null,
    previousWebsocketState: WebsocketConnectedState | null,
    isOnAppStart: boolean,
): boolean {
    return websocketState === 'connected' &&
           isReconnection(previousWebsocketState, isOnAppStart);
}

class NetworkConnectivityManagerSingleton {
    private currentServerUrl: string | null = null;
    private websocketState: WebsocketConnectedState | null = null;
    private previousWebsocketState: WebsocketConnectedState | null = null;
    private isOnAppStart = true;
    private netInfo: {isInternetReachable: boolean | null} | null = null;
    private appState: string | null = null;
    private readonly intl = getIntlShape();
    private currentPerformanceState: NetworkPerformanceState | null = null;
    private suppressSlowPerformanceBanner = false;

    private getConnectionMessage(): string {
        if (!this.websocketState || !this.netInfo) {
            return this.intl.formatMessage({id: 'connection_banner.status_unknown', defaultMessage: 'Connection status unknown'});
        }

        return getConnectionMessageText(this.websocketState, this.netInfo.isInternetReachable, this.intl.formatMessage);
    }

    private getPerformanceMessage(): string {
        return this.intl.formatMessage({id: 'connection_banner.limited_network_connection', defaultMessage: 'Limited network connection'});
    }

    private showConnectivity(isConnected: boolean, durationMs?: number) {
        const message = this.getConnectionMessage();
        const bannerConfig = this.createConnectivityBannerConfig(message, isConnected);

        if (durationMs) {
            BannerManager.showBannerWithAutoHide(bannerConfig, durationMs);
        } else {
            BannerManager.showBanner(bannerConfig);
        }
    }

    private showPerformance(durationMs: number) {
        const message = this.getPerformanceMessage();
        const bannerConfig = this.createPerformanceBannerConfig(message);
        BannerManager.showBannerWithAutoHide(bannerConfig, durationMs);
    }

    private createConnectivityBannerConfig(message: string, isConnected: boolean): FloatingBannerConfig {
        return {
            id: NETWORK_STATUS_BANNER_ID,
            dismissible: true,
            customComponent: React.createElement(ConnectionBanner, {
                isConnected,
                message,
                dismissible: true,
                onDismiss: () => {
                    // Placeholder to enable dismiss button - actual dismissal handled by BannerManager
                },
            }),
            position: 'bottom',
        };
    }

    private createPerformanceBannerConfig(message: string): FloatingBannerConfig {
        return {
            id: NETWORK_STATUS_BANNER_ID,
            dismissible: true,
            onDismiss: () => {
                this.suppressSlowPerformanceBanner = true;
            },
            customComponent: React.createElement(ConnectionBanner, {
                isConnected: false,
                message,
                dismissible: true,
                onDismiss: () => {
                    // Placeholder to enable dismiss button - actual dismissal handled by BannerManager
                },
            }),
            position: 'bottom',
        };
    }

    init(serverUrl: string | null = null) {
        this.currentServerUrl = serverUrl;
        this.cleanup();
    }

    setServerConnectionStatus(connected: boolean, serverUrl: string | null = null) {
        this.currentServerUrl = serverUrl;

        if (!connected) {
            BannerManager.hideBanner(NETWORK_STATUS_BANNER_ID);
            this.websocketState = null;
            this.previousWebsocketState = null;
        }
    }

    updateState(
        websocketState: WebsocketConnectedState,
        netInfo: {isInternetReachable: boolean | null},
        appState: string,
    ) {
        this.previousWebsocketState = this.websocketState;
        this.websocketState = websocketState;
        this.netInfo = netInfo;
        this.appState = appState;

        this.updateBanner();

        if (websocketState === 'connected' && this.isOnAppStart) {
            this.isOnAppStart = false;
        }
    }

    updatePerformanceState(
        performanceState: NetworkPerformanceState,
    ) {
        const wasSlowPerformance = this.currentPerformanceState === 'slow';
        this.currentPerformanceState = performanceState;

        // Performance state changes require special handling to avoid showing reconnection banners.
        // We can't always call updateBanner() like updateState() does, because it would re-evaluate
        // all banner conditions (including reconnection) when only performance has changed.

        // Show slow performance banner (suppression check here prevents unnecessary updateBanner calls.
        // suppressSlowPerformanceBanner also checks suppression for calls coming from updateState).

        if (performanceState === 'slow' && !this.suppressSlowPerformanceBanner) {
            this.updateBanner();
        } else if (wasSlowPerformance && performanceState === 'normal') {
            BannerManager.hideBanner(NETWORK_STATUS_BANNER_ID);
        }
    }

    reset() {
        this.suppressSlowPerformanceBanner = false;
    }

    cleanup() {
        BannerManager.cleanup();
        this.previousWebsocketState = null;
        this.isOnAppStart = true;
        this.reset();
    }

    shutdown() {
        this.cleanup();
        this.currentServerUrl = null;
        this.websocketState = null;
        this.netInfo = null;
        this.appState = null;
        this.currentPerformanceState = null;
    }

    private updateBanner() {
        if (!this.currentServerUrl || this.appState === 'background') {
            BannerManager.hideBanner(NETWORK_STATUS_BANNER_ID);
            return;
        }

        // Banner priority order (highest to lowest)
        // 1. Disconnected - critical connection loss
        if (this.handleDisconnectedState()) {
            return;
        }

        // 2. Performance - slow network warning
        if (this.handlePerformanceState()) {
            return;
        }

        // 3. Connecting - attempting to reconnect
        if (this.handleConnectingState()) {
            return;
        }

        // 4. Reconnection - successful reconnection (auto-hide)
        if (this.handleReconnectionState()) {
            return;
        }

        BannerManager.hideBanner(NETWORK_STATUS_BANNER_ID);
    }

    private handleDisconnectedState(): boolean {
        if (shouldShowDisconnectedBanner(this.websocketState, this.isOnAppStart)) {
            this.showConnectivity(false);
            return true;
        }
        return false;
    }

    private handleConnectingState(): boolean {
        if (shouldShowConnectingBanner(this.websocketState, this.isOnAppStart)) {
            this.showConnectivity(false);
            return true;
        }
        return false;
    }

    private handlePerformanceState(): boolean {
        if (shouldShowPerformanceBanner(this.currentPerformanceState, this.suppressSlowPerformanceBanner)) {
            this.showPerformance(PERFORMANCE_BANNER_DURATION);
            return true;
        }
        return false;
    }

    private handleReconnectionState(): boolean {
        if (shouldShowReconnectionBanner(
            this.websocketState,
            this.previousWebsocketState,
            this.isOnAppStart,
        )) {
            this.showConnectivity(true, RECONNECTION_BANNER_DURATION);
            return true;
        }
        return false;
    }
}

const NetworkConnectivityManager = new NetworkConnectivityManagerSingleton();

export default NetworkConnectivityManager;

export const testExports = {
    NetworkConnectivityManager: NetworkConnectivityManagerSingleton,
    getConnectionMessageText,
    isReconnection,
    shouldShowDisconnectedBanner,
    shouldShowConnectingBanner,
    shouldShowPerformanceBanner,
    shouldShowReconnectionBanner,
    RECONNECTION_BANNER_DURATION,
    PERFORMANCE_BANNER_DURATION,
    NETWORK_STATUS_BANNER_ID,
};
