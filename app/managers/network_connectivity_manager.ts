// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import ConnectionBanner from '@components/connection_banner/connection_banner';
import {Screens} from '@constants';
import {showOverlay, dismissOverlay} from '@screens/navigation';
import {toMilliseconds} from '@utils/datetime';

import type {BannerConfig} from '@context/floating_banner';

const FLOATING_BANNER_OVERLAY_ID = 'floating-banner-overlay';
const TIME_TO_OPEN = toMilliseconds({seconds: 1});
const TIME_TO_CLOSE = toMilliseconds({seconds: 5});

class NetworkConnectivityManagerSingleton {
    private isOverlayVisible = false;
    private openTimeout: NodeJS.Timeout | null = null;
    private closeTimeout: NodeJS.Timeout | null = null;
    private isServerConnected = false;
    private currentServerUrl: string | null = null;
    private websocketState: WebsocketConnectedState | null = null;
    private netInfo: {isInternetReachable: boolean | null} | null = null;
    private appState: string | null = null;
    private formatMessage: ((descriptor: {id: string; defaultMessage: string}) => string) | null = null;
    private lastShownIsConnected: boolean | null = null;
    private lastShownMessage: string | null = null;
    private lastDismissedKey: string | null = null;
    private autoHideExpiresAt: number | null = null;

    private clearTimeout(timeout: NodeJS.Timeout | null) {
        if (timeout) {
            clearTimeout(timeout);
        }
    }

    private getConnectionMessage(): string {
        if (!this.formatMessage || !this.websocketState || !this.netInfo) {
            return 'Connection status unknown';
        }

        const isConnected = this.websocketState === 'connected';

        if (isConnected) {
            return this.formatMessage({id: 'connection_banner.connected', defaultMessage: 'Connection restored'});
        }

        if (this.websocketState === 'connecting') {
            return this.formatMessage({id: 'connection_banner.connecting', defaultMessage: 'Connecting...'});
        }

        if (this.netInfo.isInternetReachable) {
            return this.formatMessage({id: 'connection_banner.not_reachable', defaultMessage: 'The server is not reachable'});
        }

        return this.formatMessage({id: 'connection_banner.not_connected', defaultMessage: 'Unable to connect to network'});
    }

    private showConnectivityOverlay() {
        if (!this.currentServerUrl) {
            return;
        }

        const message = this.getConnectionMessage();
        const isConnected = this.websocketState === 'connected';

        if (this.isOverlayVisible) {
            if (this.lastShownIsConnected === isConnected && this.lastShownMessage === message) {
                return;
            }
            dismissOverlay(FLOATING_BANNER_OVERLAY_ID);
            this.isOverlayVisible = false;
        }

        this.isOverlayVisible = true;
        this.clearTimeout(this.closeTimeout);

        const handleDismiss = () => {
            this.isOverlayVisible = false;
            const key = `${this.lastShownIsConnected}-${this.lastShownMessage}`;
            this.lastDismissedKey = key;
            dismissOverlay(FLOATING_BANNER_OVERLAY_ID);
        };

        const bannerConfig: BannerConfig = {
            id: 'connectivity',
            title: '', // Not used when customContent is provided
            message: '', // Not used when customContent is provided
            dismissible: true,
            customContent: React.createElement(ConnectionBanner, {
                isConnected,
                message,
                dismissible: true,
                onDismiss: handleDismiss,
            }),
            onDismiss: handleDismiss,

            position: 'bottom',
        };

        showOverlay(
            Screens.FLOATING_BANNER,
            {
                banners: [bannerConfig],
                onDismiss: (id: string) => {
                    if (id === 'connectivity') {
                        this.isOverlayVisible = false;
                        const key = `${this.lastShownIsConnected}-${this.lastShownMessage}`;
                        this.lastDismissedKey = key;
                        dismissOverlay(FLOATING_BANNER_OVERLAY_ID);
                    }
                },
            },
            {
                overlay: {
                    interceptTouchOutside: false,
                },
            },
            FLOATING_BANNER_OVERLAY_ID,
        );

        this.lastShownIsConnected = isConnected;
        this.lastShownMessage = message;
        this.autoHideExpiresAt = null;
    }

    private hideConnectivityOverlay() {
        if (!this.isOverlayVisible) {
            return;
        }

        this.isOverlayVisible = false;
        dismissOverlay(FLOATING_BANNER_OVERLAY_ID);
        this.clearTimeout(this.closeTimeout);

        this.lastShownIsConnected = null;
        this.lastShownMessage = null;
    }

    private showWithDelay() {
        if (this.isOverlayVisible) {
            return;
        }

        this.openTimeout = setTimeout(() => {
            this.showConnectivityOverlay();
        }, TIME_TO_OPEN);
    }

    private showWithAutoHide(durationMs: number = TIME_TO_CLOSE) {
        this.showConnectivityOverlay();
        this.autoHideExpiresAt = Date.now() + durationMs;
        this.closeTimeout = setTimeout(() => {
            this.hideConnectivityOverlay();
        }, durationMs);
    }

    setServerConnectionStatus(connected: boolean, serverUrl: string | null = null) {
        this.isServerConnected = connected;
        this.currentServerUrl = serverUrl;

        if (!connected) {
            this.hideConnectivityOverlay();
        }
    }

    updateState(
        websocketState: WebsocketConnectedState,
        netInfo: {isInternetReachable: boolean | null},
        appState: string,
        formatMessage: (descriptor: {id: string; defaultMessage: string}) => string,
    ) {
        if (!this.isServerConnected || !this.currentServerUrl) {
            this.hideConnectivityOverlay();
            return;
        }

        this.websocketState = websocketState;
        this.netInfo = netInfo;
        this.appState = appState;
        this.formatMessage = formatMessage;

        this.clearTimeout(this.openTimeout);
        this.clearTimeout(this.closeTimeout);

        this.applyState(false, false);
    }

    cleanup() {
        this.clearTimeout(this.openTimeout);
        this.clearTimeout(this.closeTimeout);
        this.hideConnectivityOverlay();
        this.isOverlayVisible = false;
    }

    public reapply() {
        if (!this.websocketState || !this.netInfo || !this.appState || !this.formatMessage) {
            return;
        }
        this.clearTimeout(this.openTimeout);
        this.clearTimeout(this.closeTimeout);

        this.isOverlayVisible = false;
        this.applyState(true, true);
    }

    private applyState(immediate: boolean, fromReapply: boolean) {
        const isConnected = this.websocketState === 'connected';
        const currentMessage = this.getConnectionMessage();
        const currentKey = `${isConnected}-${currentMessage}`;

        if (this.appState === 'background') {
            this.hideConnectivityOverlay();
            return;
        }

        if (fromReapply && isConnected) {
            const remaining = this.autoHideExpiresAt ? this.autoHideExpiresAt - Date.now() : 0;
            if (remaining > 0) {
                this.showWithAutoHide(remaining);
            }
            return;
        }

        if (this.websocketState === 'connecting') {
            this.showConnectivityOverlay();
            return;
        }

        if (!isConnected) {
            if (fromReapply && this.lastDismissedKey === currentKey) {
                return;
            }
            if (immediate) {
                this.showConnectivityOverlay();
            } else {
                this.showWithDelay();
            }
            return;
        }

        this.showWithAutoHide();
    }
}

export const testExports = {
    NetworkConnectivityManager: NetworkConnectivityManagerSingleton,
    FLOATING_BANNER_OVERLAY_ID,
    TIME_TO_OPEN,
    TIME_TO_CLOSE,
};

const NetworkConnectivityManager = new NetworkConnectivityManagerSingleton();
export default NetworkConnectivityManager;
