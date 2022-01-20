// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetInfo, {NetInfoState} from '@react-native-community/netinfo';
import {AppState, AppStateStatus} from 'react-native';

import {setCurrentUserStatusOffline} from '@actions/local/user';
import {fetchStatusByIds} from '@actions/remote/user';
import {handleClose, handleEvent, handleFirstConnect, handleReconnect} from '@actions/websocket';
import WebSocketClient from '@client/websocket';
import {General} from '@constants';
import DatabaseManager from '@database/manager';
import {queryCurrentUserId, resetWebSocketLastDisconnected} from '@queries/servers/system';
import {queryAllUsers} from '@queries/servers/user';

import type {ServerCredential} from '@typings/credentials';

class WebsocketManager {
    private clients: Record<string, WebSocketClient> = {};
    private statusUpdatesIntervalIDs: Record<string, NodeJS.Timer> = {};
    private previousAppState: AppStateStatus;
    private netConnected = false;

    constructor() {
        this.previousAppState = AppState.currentState;
    }

    public init = async (serverCredentials: ServerCredential[]) => {
        this.netConnected = Boolean((await NetInfo.fetch()).isConnected);
        await Promise.all(
            serverCredentials.map(
                async ({serverUrl, token}) => {
                    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
                    if (!operator) {
                        return;
                    }
                    await resetWebSocketLastDisconnected(operator);
                    try {
                        this.createClient(serverUrl, token, 0);
                    } catch (error) {
                        console.log('WebsocketManager init error', error); //eslint-disable-line no-console
                    }
                },
            ),
        );

        AppState.addEventListener('change', this.onAppStateChange);
        NetInfo.addEventListener(this.onNetStateChange);
    };

    public invalidateClient = (serverUrl: string) => {
        this.clients[serverUrl]?.close();
        this.clients[serverUrl]?.invalidate();
        delete this.clients[serverUrl];
    };

    public createClient = (serverUrl: string, bearerToken: string, storedLastDisconnect = 0) => {
        const client = new WebSocketClient(serverUrl, bearerToken, storedLastDisconnect);

        client.setFirstConnectCallback(() => this.onFirstConnect(serverUrl));
        client.setEventCallback((evt: any) => handleEvent(serverUrl, evt));

        //client.setMissedEventsCallback(() => {}) Nothing to do on missedEvents callback
        client.setReconnectCallback(() => this.onReconnect(serverUrl));
        client.setCloseCallback((connectFailCount: number, lastDisconnect: number) => this.onWebsocketClose(serverUrl, connectFailCount, lastDisconnect));

        if (this.netConnected && ['unknown', 'active'].includes(AppState.currentState)) {
            client.initialize();
        }
        this.clients[serverUrl] = client;

        return this.clients[serverUrl];
    };

    public closeAll = () => {
        for (const client of Object.values(this.clients)) {
            client.close(true);
        }
    };

    public openAll = () => {
        for (const client of Object.values(this.clients)) {
            if (!client.isConnected()) {
                client.initialize();
            }
        }
    };

    public isConnected = (serverUrl: string): boolean => {
        return this.clients[serverUrl]?.isConnected();
    };

    private onFirstConnect = (serverUrl: string) => {
        this.startPeriodicStatusUpdates(serverUrl);
        handleFirstConnect(serverUrl);
    };

    private onReconnect = (serverUrl: string) => {
        this.startPeriodicStatusUpdates(serverUrl);
        handleReconnect(serverUrl);
    };

    private onWebsocketClose = async (serverUrl: string, connectFailCount: number, lastDisconnect: number) => {
        if (connectFailCount <= 1) { // First fail
            await setCurrentUserStatusOffline(serverUrl);
            await handleClose(serverUrl, lastDisconnect);

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

            const currentUserId = await queryCurrentUserId(database.database);
            const users = await queryAllUsers(database.database);

            const userIds = users.map((u) => u.id).filter((id) => id !== currentUserId);
            if (!userIds.length) {
                return;
            }

            fetchStatusByIds(serverUrl, userIds);
        };

        currentId = setInterval(getStatusForUsers, General.STATUS_INTERVAL);
        this.statusUpdatesIntervalIDs[serverUrl] = currentId;
    }

    private stopPeriodicStatusUpdates(serverUrl: string) {
        const currentId = this.statusUpdatesIntervalIDs[serverUrl];
        if (currentId != null) {
            clearInterval(currentId);
        }

        delete this.statusUpdatesIntervalIDs[serverUrl];
    }

    private onAppStateChange = async (appState: AppStateStatus) => {
        if (appState === this.previousAppState) {
            return;
        }

        if (appState !== 'active') {
            this.closeAll();
            this.previousAppState = appState;
            return;
        }

        if (appState === 'active' && this.netConnected) { // Reopen the websockets only if there is connection
            this.openAll();
            this.previousAppState = appState;
            return;
        }

        this.previousAppState = appState;
    };

    private onNetStateChange = async (netState: NetInfoState) => {
        const newState = Boolean(netState.isConnected);
        if (this.netConnected === newState) {
            return;
        }

        this.netConnected = newState;

        if (this.netConnected && this.previousAppState === 'active') { // Reopen the websockets only if the app is active
            this.openAll();
            return;
        }

        this.closeAll();
    };
}

export default new WebsocketManager();
