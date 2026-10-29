// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppState, NativeModules, Platform} from 'react-native';
import {requestNotifications} from 'react-native-permissions';

import WebsocketManager from '@managers/websocket_manager';
import {addWireGuardStateListener, getWireGuardState, WireGuardStatus} from '@managers/wireguard_manager';
import {logWarning} from '@utils/log';

import {clearDirectNotificationHistory} from './handler';
import {
    getCachedNotificationDeliveryMode,
    isDirectNotificationServer,
    loadNotificationDeliveryModes,
    NotificationDeliveryMode,
    persistNotificationDeliveryMode,
    removeNotificationDeliveryMode,
} from './mode';

type NativeDirectNotificationsModule = {
    startService?: (title: string, text: string) => Promise<void>;
    stopService?: () => Promise<void>;
};

function getNativeModule(): NativeDirectNotificationsModule | undefined {
    if (Platform.OS !== 'android') {
        return undefined;
    }
    return NativeModules.ENCMADirectNotifications as NativeDirectNotificationsModule | undefined;
}

class DirectNotificationManagerSingleton {
    private activeServers = new Set<string>();
    private removeWireGuardListener?: () => void;
    private serviceRunning = false;
    private reconcileQueue: Promise<void> = Promise.resolve();

    public init = async (serverCredentials: ServerCredential[]): Promise<void> => {
        this.activeServers = new Set(serverCredentials.map(({serverUrl}) => serverUrl));
        await loadNotificationDeliveryModes();

        this.removeWireGuardListener?.();
        this.removeWireGuardListener = addWireGuardStateListener(this.onWireGuardStateChange);

        // Reconciliation reads native WireGuard state and may start the
        // foreground service or open server sockets. None of that belongs on
        // the critical splash/initialization path: an unavailable VPN or
        // server must not prevent the server/login UI from appearing.
        this.reconcile().catch((error) => logWarning('Direct notification startup reconciliation failed', error));
    };

    public cleanup = (): void => {
        this.removeWireGuardListener?.();
        this.removeWireGuardListener = undefined;
    };

    public onServerLoggedIn = async (serverUrl: string): Promise<void> => {
        this.activeServers.add(serverUrl);
        if (isDirectNotificationServer(serverUrl) && Platform.OS === 'android') {
            try {
                // Direct uses local notifications rather than FCM, but Android
                // still requires the user-facing notification permission.
                await requestNotifications(['alert', 'sound', 'badge']);
            } catch (error) {
                logWarning('Direct notification permission request failed', error);
            }
        }
        await this.reconcile();
    };

    public setMode = async (serverUrl: string, mode: NotificationDeliveryMode): Promise<void> => {
        const previousMode = getCachedNotificationDeliveryMode(serverUrl);
        await persistNotificationDeliveryMode(serverUrl, mode);

        if (previousMode === NotificationDeliveryMode.DIRECT && mode !== NotificationDeliveryMode.DIRECT && AppState.currentState !== 'active') {
            WebsocketManager.getClient(serverUrl)?.close(true);
        }

        if (mode === NotificationDeliveryMode.DIRECT && Platform.OS === 'android') {
            try {
                await requestNotifications(['alert', 'sound', 'badge']);
            } catch (error) {
                logWarning('Direct notification permission request failed', error);
            }
        }
        await this.reconcile();
    };

    public onSessionTerminated = async (serverUrl: string, removeServer: boolean): Promise<void> => {
        this.activeServers.delete(serverUrl);
        clearDirectNotificationHistory(serverUrl);
        if (removeServer) {
            try {
                await removeNotificationDeliveryMode(serverUrl);
            } catch (error) {
                logWarning('Direct notification mode cleanup failed', error);
            }
        }
        await this.reconcile();
    };

    public reconcile = (): Promise<void> => {
        const next = this.reconcileQueue.then(() => this.reconcileInternal());
        this.reconcileQueue = next.catch(() => undefined);
        return next;
    };

    private reconcileInternal = async (): Promise<void> => {
        const hasDirectServer = Array.from(this.activeServers).some((serverUrl) => isDirectNotificationServer(serverUrl));
        const wireGuardConnected = hasDirectServer && await this.isWireGuardConnected();

        if (hasDirectServer && wireGuardConnected) {
            const serviceStarted = await this.startService();
            if (serviceStarted) {
                await WebsocketManager.openDirectClients('WebSocket Reconnect');
            } else if (AppState.currentState !== 'active') {
                WebsocketManager.closeDirectClients();
            }
        } else {
            WebsocketManager.closeDirectClients();
            await this.stopService();
        }
    };

    private isWireGuardConnected = async (): Promise<boolean> => {
        if (Platform.OS !== 'android') {
            return false;
        }
        try {
            const state = await getWireGuardState();
            return state.status === WireGuardStatus.Connected;
        } catch {
            // An old or incomplete native build must not claim that Direct is
            // running when its WireGuard state cannot be verified.
            return false;
        }
    };

    private onWireGuardStateChange = (state: {status: string}): void => {
        if (state.status === WireGuardStatus.Connected) {
            this.reconcile().catch((error) => logWarning('Direct notification reconnect failed', error));
            return;
        }

        WebsocketManager.closeDirectClients();
        this.stopService().catch((error) => logWarning('Direct notification service stop failed', error));
    };

    private startService = async (): Promise<boolean> => {
        if (this.serviceRunning) {
            return true;
        }
        const nativeModule = getNativeModule();
        if (!nativeModule?.startService) {
            return false;
        }
        try {
            await nativeModule.startService('ENCMA', 'Direct server notifications are active');
            this.serviceRunning = true;
            return true;
        } catch (error) {
            this.serviceRunning = false;
            logWarning('Direct notification service start failed', error);
            return false;
        }
    };

    private stopService = async (): Promise<void> => {
        const nativeModule = getNativeModule();
        if (!nativeModule?.stopService) {
            this.serviceRunning = false;
            return;
        }
        try {
            // Also call this when the JS flag is false: a native service can
            // outlive a reload of the React Native context.
            await nativeModule.stopService();
            this.serviceRunning = false;
        } catch (error) {
            logWarning('Direct notification service stop failed', error);
        }
    };
}

const DirectNotificationManager = new DirectNotificationManagerSingleton();
export default DirectNotificationManager;
