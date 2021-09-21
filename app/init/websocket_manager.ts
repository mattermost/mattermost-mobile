// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetInfo, {NetInfoState} from '@react-native-community/netinfo';
import {AppState, AppStateStatus} from 'react-native';

import {setCurrentUserStatusOffline} from '@actions/local/user';
import {fetchStatusByIds} from '@actions/remote/user';
import {handleClose, handleEvent, handleFirstConnect, handleReconnect} from '@actions/websocket';
import WebSocketClient from '@app/client/websocket';
import {General} from '@app/constants';
import {queryWebSocketLastDisconnected} from '@app/queries/servers/system';
import {queryAllUsers} from '@app/queries/servers/user';
import DatabaseManager from '@database/manager';

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
        console.log('WSM: init');
        this.netConnected = Boolean((await NetInfo.fetch()).isConnected);
        await Promise.all(
            serverCredentials.map(
                async ({serverUrl, token}) => {
                    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
                    if (!database) {
                        console.log('no database for', serverUrl);
                        return;
                    }
                    const lastDisconnect = await queryWebSocketLastDisconnected(database);
                    try {
                        this.createClient(serverUrl, token, lastDisconnect);
                    } catch (error) {
                        console.log('WebsocketManager init error', error); //eslint-disable-line no-console
                    }
                },
            ),
        );

        AppState.addEventListener('change', this.onAppStateChange);
        NetInfo.addEventListener(this.onNetStateChange);
    }

    public invalidateClient = (serverURL: string) => {
        console.log('WSM: invalidate');
        this.clients[serverURL]?.close();
        this.clients[serverURL]?.invalidate();
        delete this.clients[serverURL];
    }

    public createClient = (serverURL: string, bearerToken: string, storedLastDisconnect = 0) => {
        console.log('WSM: create');
        console.log('storedLastDisconnect', storedLastDisconnect);
        const client = new WebSocketClient(serverURL, bearerToken, storedLastDisconnect);

        client.setFirstConnectCallback(() => this.onFirstConnect(serverURL));
        client.setEventCallback((evt: any) => handleEvent(serverURL, evt));

        //client.setMissedEventsCallback(() => {}) Nothing to do on missedEvents callback
        client.setReconnectCallback(() => this.onReconnect(serverURL));
        client.setCloseCallback((connectFailCount: number, lastDisconnect: number) => this.onWebsocketClose(serverURL, connectFailCount, lastDisconnect));

        if (this.netConnected) {
            console.log('CREATE WS', serverURL);
            client.initialize();
        }
        this.clients[serverURL] = client;

        return this.clients[serverURL];
    }

    public closeAll = () => {
        console.log('WSM: close all');
        for (const client of Object.values(this.clients)) {
            client.close(true);
        }
    }

    public openAll = () => {
        console.log('WSM: open all');
        for (const client of Object.values(this.clients)) {
            console.log('CLIENT', client.isConnected());
            if (!client.isConnected()) {
                client.initialize();
            }
        }
    }

    public isConnected = (serverURL: string): boolean => {
        return this.clients[serverURL]?.isConnected();
    }

    private onFirstConnect = (serverURL: string) => {
        console.log('WSM: on first connect');

        this.startPeriodicStatusUpdates(serverURL);
        handleFirstConnect(serverURL);
    }

    private onReconnect = (serverURL: string) => {
        this.startPeriodicStatusUpdates(serverURL);
        handleReconnect(serverURL);
    }

    private onWebsocketClose = async (serverURL: string, connectFailCount: number, lastDisconnect: number) => {
        console.log('WSM: on websocket close');
        console.log(connectFailCount);
        if (connectFailCount <= 1) { // First fail
            console.log('STORE LAST DISCONNECT', lastDisconnect);
            await setCurrentUserStatusOffline(serverURL);
            await handleClose(serverURL, lastDisconnect);

            this.stopPeriodicStatusUpdates(serverURL);
        }
    }

    private startPeriodicStatusUpdates(serverURL: string) {
        let currentId = this.statusUpdatesIntervalIDs[serverURL];
        if (currentId != null) {
            clearInterval(currentId);
        }

        const getStatusForUsers = async () => {
            const database = DatabaseManager.serverDatabases[serverURL];
            if (!database) {
                return;
            }

            const users = await queryAllUsers(database.database);

            const userIds = users.map((u) => u.id);
            if (!userIds.length) {
                return;
            }

            fetchStatusByIds(serverURL, userIds);
        };

        currentId = setInterval(getStatusForUsers, General.STATUS_INTERVAL);
        this.statusUpdatesIntervalIDs[serverURL] = currentId;
    }

    private stopPeriodicStatusUpdates(serverURL: string) {
        const currentId = this.statusUpdatesIntervalIDs[serverURL];
        if (currentId != null) {
            clearInterval(currentId);
        }

        delete this.statusUpdatesIntervalIDs[serverURL];
    }

    private onAppStateChange = async (appState: AppStateStatus) => {
        console.log('WSM: AppStateChange');
        console.log('AppState', appState);
        console.log('Previous AppState', this.previousAppState);
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
            console.log('OPEN FROM STATE');
            this.previousAppState = appState;
            return;
        }

        this.previousAppState = appState;
    }

    private onNetStateChange = async (netState: NetInfoState) => {
        console.log('WSM: onNetStateChange');
        console.log(netState);
        console.log(netState.isConnected);
        console.log(this.netConnected);
        const newState = Boolean(netState.isConnected);
        if (this.netConnected === newState) {
            return;
        }

        this.netConnected = newState;

        if (this.netConnected && this.previousAppState === 'active') { // Reopen the websockets only if the app is active
            console.log('OPEN FROM NET');
            this.openAll();
            return;
        }

        this.closeAll();
    }
}

export default new WebsocketManager();
