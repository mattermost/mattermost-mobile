// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetInfo, {type NetInfoState, type NetInfoSubscription} from '@react-native-community/netinfo';
import {AppState, type AppStateStatus, type NativeEventSubscription} from 'react-native';
import BackgroundTimer from 'react-native-background-timer';
import {BehaviorSubject} from 'rxjs';
import {distinctUntilChanged} from 'rxjs/operators';

import {setCurrentUserStatus} from '@actions/local/user';
import {fetchStatusByIds} from '@actions/remote/user';
import {handleEvent, handleFirstConnect, handleReconnect} from '@actions/websocket';
import WebSocketClient from '@client/websocket';
import {General} from '@constants';
import DatabaseManager from '@database/manager';
import {getCurrentUserId} from '@queries/servers/system';
import {queryAllUsers} from '@queries/servers/user';
import {toMilliseconds} from '@utils/datetime';
import {isMainActivity} from '@utils/helpers';
import {logError} from '@utils/log';

const WAIT_TO_CLOSE = toMilliseconds({seconds: 15});
const WAIT_UNTIL_NEXT = toMilliseconds({seconds: 5});

class WebsocketManager {
    private connectedSubjects: {[serverUrl: string]: BehaviorSubject<WebsocketConnectedState>} = {};

    private clients: Record<string, WebSocketClient> = {};
    private connectionTimerIDs: Record<string, NodeJS.Timeout> = {};
    private isBackgroundTimerRunning = false;
    private netConnected = false;
    private previousActiveState: boolean;
    private statusUpdatesIntervalIDs: Record<string, NodeJS.Timeout> = {};
    private backgroundIntervalId: number | undefined;
    private firstConnectionSynced: Record<string, boolean> = {};

    private appStateSubscription: NativeEventSubscription | undefined;
    private netStateSubscription: NetInfoSubscription | undefined;

    constructor() {
        this.previousActiveState = AppState.currentState === 'active';
    }

    public init = async (serverCredentials: ServerCredential[]) => {
        this.netConnected = Boolean((await NetInfo.fetch()).isConnected);
        serverCredentials.forEach(
            ({serverUrl, token}) => {
                try {
                    DatabaseManager.getServerDatabaseAndOperator(serverUrl);
                    this.createClient(serverUrl, token);
                } catch (error) {
                    logError('WebsocketManager init error', error);
                }
            },
        );

        this.appStateSubscription?.remove();
        this.netStateSubscription?.();

        this.appStateSubscription = AppState.addEventListener('change', this.onAppStateChange);
        this.netStateSubscription = NetInfo.addEventListener(this.onNetStateChange);
    };

    public invalidateClient = (serverUrl: string) => {
        this.clients[serverUrl]?.close(true);
        this.clients[serverUrl]?.invalidate();
        clearTimeout(this.connectionTimerIDs[serverUrl]);
        delete this.clients[serverUrl];
        delete this.firstConnectionSynced[serverUrl];

        // We don't remove the connected subject so any potential client invalidation
        // and subsequent creation of the client can still be observed by the component.
        // Being purist, this is a memory leak, since we never clean any server url,
        // but since this information lives in memory and we don't expect many servers
        // to be added and removed in one single session, this should be fine.
        this.getConnectedSubject(serverUrl).next('not_connected');
    };

    public createClient = (serverUrl: string, bearerToken: string) => {
        if (this.clients[serverUrl]) {
            this.invalidateClient(serverUrl);
        }

        const client = new WebSocketClient(serverUrl, bearerToken);

        client.setFirstConnectCallback(() => this.onFirstConnect(serverUrl));
        client.setEventCallback((evt: any) => handleEvent(serverUrl, evt));

        //client.setMissedEventsCallback(() => {}) Nothing to do on missedEvents callback
        client.setReconnectCallback(() => this.onReconnect(serverUrl));
        client.setReliableReconnectCallback(() => this.onReliableReconnect(serverUrl));
        client.setCloseCallback((connectFailCount: number) => this.onWebsocketClose(serverUrl, connectFailCount));

        this.clients[serverUrl] = client;

        return this.clients[serverUrl];
    };

    public closeAll = () => {
        for (const url of Object.keys(this.clients)) {
            const client = this.clients[url];
            client.close(true);
            this.getConnectedSubject(url).next('not_connected');
        }
    };

    public openAll = async () => {
        let queued = 0;
        for await (const clientUrl of Object.keys(this.clients)) {
            const activeServerUrl = await DatabaseManager.getActiveServerUrl();
            if (clientUrl === activeServerUrl) {
                this.initializeClient(clientUrl);
            } else {
                queued += 1;
                this.getConnectedSubject(clientUrl).next('connecting');
                this.connectionTimerIDs[clientUrl] = setTimeout(() => this.initializeClient(clientUrl), WAIT_UNTIL_NEXT * queued);
            }
        }
    };

    public isConnected = (serverUrl: string): boolean => {
        return this.clients[serverUrl]?.isConnected();
    };

    public observeWebsocketState = (serverUrl: string) => {
        return this.getConnectedSubject(serverUrl).asObservable().pipe(
            distinctUntilChanged(),
        );
    };

    private getConnectedSubject = (serverUrl: string) => {
        if (!this.connectedSubjects[serverUrl]) {
            this.connectedSubjects[serverUrl] = new BehaviorSubject(this.isConnected(serverUrl) ? 'connected' : 'not_connected');
        }

        return this.connectedSubjects[serverUrl];
    };

    private cancelConnectTimers = () => {
        for (const [url, timer] of Object.entries(this.connectionTimerIDs)) {
            clearTimeout(timer);
            delete this.connectionTimerIDs[url];
        }
    };

    public initializeClient = async (serverUrl: string) => {
        const client: WebSocketClient = this.clients[serverUrl];
        clearTimeout(this.connectionTimerIDs[serverUrl]);
        delete this.connectionTimerIDs[serverUrl];
        if (!client?.isConnected()) {
            const hasSynced = this.firstConnectionSynced[serverUrl];
            client.initialize({}, !hasSynced);
            if (!hasSynced) {
                const error = await handleFirstConnect(serverUrl);
                if (error) {
                    // This will try to reconnect and try to sync again
                    client.close(false);
                }

                // Makes sure a client still exist, and therefore we haven't been logged out
                if (this.clients[serverUrl]) {
                    this.firstConnectionSynced[serverUrl] = true;
                }
            }
        }
    };

    private onFirstConnect = (serverUrl: string) => {
        this.startPeriodicStatusUpdates(serverUrl);
        this.getConnectedSubject(serverUrl).next('connected');
    };

    private onReconnect = async (serverUrl: string) => {
        this.startPeriodicStatusUpdates(serverUrl);
        this.getConnectedSubject(serverUrl).next('connected');
        const error = await handleReconnect(serverUrl);
        if (error) {
            this.getClient(serverUrl)?.close(false);
        }
    };

    private onReliableReconnect = async (serverUrl: string) => {
        this.getConnectedSubject(serverUrl).next('connected');
    };

    private onWebsocketClose = async (serverUrl: string, connectFailCount: number) => {
        this.getConnectedSubject(serverUrl).next('not_connected');
        if (connectFailCount <= 1) { // First fail
            await setCurrentUserStatus(serverUrl, General.OFFLINE);
            this.stopPeriodicStatusUpdates(serverUrl);
        }
    };

    private startPeriodicStatusUpdates(serverUrl: string) {
        let currentId = this.statusUpdatesIntervalIDs[serverUrl];
        if (currentId != null) {
            clearInterval(currentId);
        }

        const getStatusForUsers = async () => {
            const database = DatabaseManager.serverDatabases[serverUrl];
            if (!database) {
                return;
            }

            const currentUserId = await getCurrentUserId(database.database);
            const userIds = (await queryAllUsers(database.database).fetchIds()).filter((id) => id !== currentUserId);

            fetchStatusByIds(serverUrl, userIds);
        };

        currentId = setInterval(getStatusForUsers, General.STATUS_INTERVAL);
        this.statusUpdatesIntervalIDs[serverUrl] = currentId;
        getStatusForUsers();
    }

    private stopPeriodicStatusUpdates(serverUrl: string) {
        clearInterval(this.statusUpdatesIntervalIDs[serverUrl]);
        delete this.statusUpdatesIntervalIDs[serverUrl];
    }

    private onAppStateChange = (appState: AppStateStatus) => {
        const isMain = isMainActivity();
        if (!isMain) {
            return;
        }

        const isActive = appState === 'active';
        this.handleStateChange(this.netConnected, isActive);
    };

    private onNetStateChange = (netState: NetInfoState) => {
        const newState = Boolean(netState.isConnected);
        if (this.netConnected === newState) {
            return;
        }

        this.handleStateChange(newState, this.previousActiveState);
    };

    private handleStateChange = (currentIsConnected: boolean, currentIsActive: boolean) => {
        if (currentIsActive === this.previousActiveState && currentIsConnected === this.netConnected) {
            return;
        }

        this.cancelConnectTimers();

        const wentBackground = this.previousActiveState && !currentIsActive;

        this.previousActiveState = currentIsActive;
        this.netConnected = currentIsConnected;

        if (!currentIsConnected) {
            this.closeAll();
            return;
        }

        if (currentIsActive) {
            if (this.isBackgroundTimerRunning) {
                BackgroundTimer.clearInterval(this.backgroundIntervalId!);
            }
            this.isBackgroundTimerRunning = false;
            if (this.netConnected) {
                this.openAll();
            }

            return;
        }

        if (wentBackground && !this.isBackgroundTimerRunning) {
            this.isBackgroundTimerRunning = true;
            this.backgroundIntervalId = BackgroundTimer.setInterval(() => {
                this.closeAll();
                BackgroundTimer.clearInterval(this.backgroundIntervalId!);
                this.isBackgroundTimerRunning = false;
            }, WAIT_TO_CLOSE);
        }
    };

    public getClient = (serverUrl: string): WebSocketClient | undefined => {
        return this.clients[serverUrl];
    };
}

export default new WebsocketManager();
