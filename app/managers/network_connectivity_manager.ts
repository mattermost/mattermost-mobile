// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import ConnectionBanner from '@components/connection_banner/connection_banner';
import {getIntlShape} from '@utils/general';

import {BannerManager} from './banner_manager';

import type {NetworkPerformanceState} from './network_performance_manager';
import type {BannerConfig} from '@components/floating_banner/types';

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
    performanceSuppressed: boolean,
): boolean {
    return performanceState === 'slow' && !performanceSuppressed;
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

    private performanceSuppressedUntilNormal = false;

    private getConnectionMessage(): string {
        if (!this.websocketState || !this.netInfo) {
            return 'Connection status unknown';
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

    private createConnectivityBannerConfig(message: string, isConnected: boolean): BannerConfig {
        return {
            id: 'connectivity',
            title: '',
            message: '',
            dismissible: true,
            onDismiss: () => {
                // Banner dismissed by user
            },
            customComponent: React.createElement(ConnectionBanner, {
                isConnected,
                message,
                dismissible: true,
                onDismiss: () => undefined,
            }),
            position: 'bottom',
        };
    }

    private createPerformanceBannerConfig(message: string): BannerConfig {
        return {
            id: 'performance',
            title: '',
            message: '',
            dismissible: true,
            onDismiss: () => {
                this.performanceSuppressedUntilNormal = true;
            },
            customComponent: React.createElement(ConnectionBanner, {
                isConnected: false,
                message,
                dismissible: true,
                onDismiss: () => undefined,
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
            BannerManager.hideBanner();
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
        this.currentPerformanceState = performanceState;

        if (this.performanceSuppressedUntilNormal && performanceState === 'normal') {
            this.performanceSuppressedUntilNormal = false;
        }

        this.updateBanner();
    }

    cleanup() {
        BannerManager.cleanup();
        this.previousWebsocketState = null;
        this.isOnAppStart = true;
    }

    shutdown() {
        this.cleanup();
        this.currentServerUrl = null;
        this.websocketState = null;
        this.netInfo = null;
        this.appState = null;
        this.currentPerformanceState = null;
        this.performanceSuppressedUntilNormal = false;
    }

    private updateBanner() {
        if (!this.currentServerUrl || this.appState === 'background') {
            BannerManager.hideBanner();
            return;
        }

        if (this.handleDisconnectedState()) {
            return;
        }

        if (this.handlePerformanceState()) {
            return;
        }

        if (this.handleConnectingState()) {
            return;
        }

        if (this.handleReconnectionState()) {
            return;
        }

        this.handleConnectedState();
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
        if (shouldShowPerformanceBanner(this.currentPerformanceState, this.performanceSuppressedUntilNormal)) {
            this.showPerformance(10000);
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
            this.showConnectivity(true, 3000);
            return true;
        }
        return false;
    }

    private handleConnectedState(): void {
        BannerManager.hideBanner();
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
};
