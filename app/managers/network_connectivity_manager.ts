// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import ConnectionBanner from '@components/connection_banner/connection_banner';
import {getIntlShape} from '@utils/general';

import {BannerManager} from './banner_manager';

import type {NetworkPerformanceState} from './network_performance_manager';
import type {BannerConfig} from '@context/floating_banner';

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
    isFirstConnection: boolean,
): boolean {
    const wasDisconnected = previousWebsocketState === 'not_connected' || previousWebsocketState === 'connecting';
    return wasDisconnected && !isFirstConnection;
}

function shouldShowDisconnectedBanner(
    websocketState: WebsocketConnectedState | null,
    isFirstConnection: boolean,
): boolean {
    return websocketState === 'not_connected' && !isFirstConnection;
}

function shouldShowConnectingBanner(
    websocketState: WebsocketConnectedState | null,
    isFirstConnection: boolean,
): boolean {
    return websocketState === 'connecting' && !isFirstConnection;
}

function shouldShowPerformanceBanner(
    websocketState: WebsocketConnectedState | null,
    performanceState: NetworkPerformanceState | null,
    performanceSuppressed: boolean,
): boolean {
    return websocketState === 'connected' &&
           performanceState === 'slow' &&
           !performanceSuppressed;
}

function shouldShowReconnectionBanner(
    websocketState: WebsocketConnectedState | null,
    previousWebsocketState: WebsocketConnectedState | null,
    isFirstConnection: boolean,
    hasShownReconnectionBanner: boolean,
    performanceSuppressed: boolean,
): boolean {
    return websocketState === 'connected' &&
           isReconnection(previousWebsocketState, isFirstConnection) &&
           !hasShownReconnectionBanner &&
           !performanceSuppressed;
}

class NetworkConnectivityManagerSingleton {
    private currentServerUrl: string | null = null;
    private websocketState: WebsocketConnectedState | null = null;
    private previousWebsocketState: WebsocketConnectedState | null = null;
    private isFirstConnection = true;
    private netInfo: {isInternetReachable: boolean | null} | null = null;
    private appState: string | null = null;
    private readonly intl = getIntlShape();
    private currentPerformanceState: NetworkPerformanceState | null = null;
    private hasShownReconnectionBanner = false;
    private autoHideExpiresAt: number | null = null;
    private autoHideType: 'connectivity' | 'performance' | null = null;

    private performanceSuppressedUntilNormal = false;
    private setAutoHideState(type: 'connectivity' | 'performance', durationMs: number) {
        this.autoHideExpiresAt = Date.now() + durationMs;
        this.autoHideType = type;
    }

    private clearAutoHideState() {
        this.autoHideExpiresAt = null;
        this.autoHideType = null;
    }

    private clearAutoHideStateAndHideBanner() {
        this.clearAutoHideState();
        BannerManager.hideBanner();
    }

    private getConnectionMessage(): string {
        if (!this.websocketState || !this.netInfo) {
            return 'Connection status unknown';
        }

        return getConnectionMessageText(this.websocketState, this.netInfo.isInternetReachable, this.intl.formatMessage);
    }

    private getPerformanceMessage(): string {
        return this.intl.formatMessage({id: 'connection_banner.performance', defaultMessage: 'Limited Network Connection'});
    }

    private showConnectivity(isConnected: boolean) {
        const message = this.getConnectionMessage();
        const bannerConfig = this.createConnectivityBannerConfig(message, isConnected);
        BannerManager.showBanner(bannerConfig);
    }

    private showConnectivityWithAutoHide(isConnected: boolean, durationMs: number) {
        const message = this.getConnectionMessage();
        const bannerConfig = this.createConnectivityBannerConfig(message, isConnected);
        BannerManager.showBannerWithAutoHide(bannerConfig, durationMs);
        this.setAutoHideState('connectivity', durationMs);
    }

    private showPerformanceWithAutoHide(durationMs: number) {
        const message = this.getPerformanceMessage();
        const bannerConfig = this.createPerformanceBannerConfig(message);
        BannerManager.showBannerWithAutoHide(bannerConfig, durationMs);
        this.setAutoHideState('performance', durationMs);
    }

    private createConnectivityBannerConfig(message: string, isConnected: boolean): BannerConfig {
        return {
            id: 'connectivity',
            title: '',
            message: '',
            dismissible: true,
            onDismiss: () => {
                this.clearAutoHideState();

                if (isConnected) {
                    this.hasShownReconnectionBanner = true;
                }
            },
            customContent: React.createElement(ConnectionBanner, {
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
                this.clearAutoHideState();
                this.performanceSuppressedUntilNormal = true;
            },
            customContent: React.createElement(ConnectionBanner, {
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

        if (this.performanceSuppressedUntilNormal && this.currentPerformanceState === 'slow') {
            return;
        }

        this.updateBanner();
    }

    updatePerformanceState(
        performanceState: NetworkPerformanceState,
    ) {
        this.currentPerformanceState = performanceState;

        if (this.performanceSuppressedUntilNormal && performanceState === 'normal') {
            this.performanceSuppressedUntilNormal = false;
        }

        if (this.autoHideType === 'performance' || performanceState === 'slow') {
            this.updateBanner();
        }
    }

    cleanup() {
        BannerManager.cleanup();
        this.previousWebsocketState = null;
        this.isFirstConnection = true;
        this.hasShownReconnectionBanner = false;
        this.clearAutoHideState();
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

    reapply() {
        if (!this.websocketState || !this.netInfo || !this.appState) {
            return;
        }

        this.previousWebsocketState = this.websocketState;

        if (this.performanceSuppressedUntilNormal && this.currentPerformanceState === 'slow') {
            return;
        }

        if (this.handleActiveAutoHideBanner()) {
            return;
        }

        this.updateBanner();
    }

    private updateBanner() {
        if (!this.currentServerUrl || this.appState === 'background') {
            this.clearAutoHideStateAndHideBanner();
            return;
        }

        if (this.handleActiveAutoHideBanner()) {
            return;
        }

        if (this.handleDisconnectedState()) {
            return;
        }

        if (this.handleConnectingState()) {
            return;
        }

        if (this.handleReconnectionState()) {
            return;
        }

        if (this.handlePerformanceState()) {
            return;
        }

        this.handleConnectedState();
    }

    private handleActiveAutoHideBanner(): boolean {
        if (!this.autoHideExpiresAt || Date.now() >= this.autoHideExpiresAt || !this.autoHideType) {
            this.clearAutoHideStateAndHideBanner();
            return false;
        }

        const remaining = this.autoHideExpiresAt - Date.now();

        if (this.autoHideType === 'performance') {
            if (this.websocketState === 'connected' && this.currentPerformanceState === 'slow') {
                const message = this.getPerformanceMessage();
                const bannerConfig = this.createPerformanceBannerConfig(message);
                BannerManager.showBannerWithAutoHide(bannerConfig, remaining);
                return true;
            }

            this.clearAutoHideStateAndHideBanner();
            return false;
        }

        if (this.autoHideType === 'connectivity') {
            if (this.websocketState === 'connected') {
                const message = this.getConnectionMessage();
                const bannerConfig = this.createConnectivityBannerConfig(message, true);
                BannerManager.showBannerWithAutoHide(bannerConfig, remaining);
                return true;
            }

            this.clearAutoHideStateAndHideBanner();
            return false;
        }

        this.clearAutoHideStateAndHideBanner();
        return false;
    }

    private handleDisconnectedState(): boolean {
        if (shouldShowDisconnectedBanner(this.websocketState, this.isFirstConnection)) {
            this.showConnectivity(false);
            this.hasShownReconnectionBanner = false;
            this.performanceSuppressedUntilNormal = false;
            return true;
        }
        return false;
    }

    private handleConnectingState(): boolean {
        if (shouldShowConnectingBanner(this.websocketState, this.isFirstConnection)) {
            this.showConnectivity(false);
            this.hasShownReconnectionBanner = false;
            this.performanceSuppressedUntilNormal = false;
            return true;
        }
        return false;
    }

    private handlePerformanceState(): boolean {
        if (shouldShowPerformanceBanner(this.websocketState, this.currentPerformanceState, this.performanceSuppressedUntilNormal)) {
            this.showPerformanceWithAutoHide(5000);
            return true;
        }
        return false;
    }

    private handleReconnectionState(): boolean {
        if (shouldShowReconnectionBanner(
            this.websocketState,
            this.previousWebsocketState,
            this.isFirstConnection,
            this.hasShownReconnectionBanner,
            this.performanceSuppressedUntilNormal,
        )) {
            this.showConnectivityWithAutoHide(true, 3000);
            this.isFirstConnection = false;
            this.hasShownReconnectionBanner = true;
            return true;
        }
        return false;
    }

    private handleConnectedState(): void {
        if (this.websocketState === 'connected') {
            this.isFirstConnection = false;
        }
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
