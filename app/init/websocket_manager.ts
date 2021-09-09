// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppState, AppStateStatus} from 'react-native';

import type {ServerCredential} from '@typings/credentials';
import WebSocketClient from '@app/client/websocket';
import {handleClose, handleEvent, handleFirstConnect, handleReconnect} from '@actions/websocket';
import NetInfo, {NetInfoState} from '@react-native-community/netinfo';
import {setCurrentUserStatusOffline} from '@actions/local/user';
import {queryWebSocketLastDisconnected} from '@app/queries/servers/system';
import DatabaseManager from '@database/manager';

class WebsocketManager {
    private clients: Record<string, WebSocketClient> = {};
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
                        console.log('no database');
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
        console.log(storedLastDisconnect);
        const client = new WebSocketClient(serverURL, bearerToken, storedLastDisconnect);

        client.setFirstConnectCallback(() => this.onFirstConnect(serverURL)); // TODO think about reconnect
        client.setEventCallback((evt: any) => handleEvent(serverURL, evt));

        //client.setMissedEventsCallback(() => {})
        client.setReconnectCallback(() => handleReconnect(serverURL));
        client.setCloseCallback((connectFailCount: number, lastDisconnect: number) => this.onWebsocketClose(serverURL, connectFailCount, lastDisconnect));

        if (this.netConnected) {
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
            client.initialize();
        }
    }

    public isConnected = (serverURL: string): boolean => {
        return this.clients[serverURL]?.isConnected();
    }

    private onFirstConnect = (serverURL: string) => {
        console.log('WSM: on first connect');

        // TODO: Start periodic status updates
        handleFirstConnect(serverURL);
    }

    private onWebsocketClose = (serverURL: string, connectFailCount: number, lastDisconnect: number) => {
        console.log('WSM: on websocket close');
        console.log(connectFailCount);
        console.log(lastDisconnect);
        if (connectFailCount <= 1) { // First fail
            setCurrentUserStatusOffline(serverURL);
            handleClose(serverURL, lastDisconnect);

            // TODO: Stop periodic status updates
        }
    }

    private onAppStateChange = async (appState: AppStateStatus) => {
        console.log('WSM: AppStateChange');
        console.log(appState);
        console.log(this.previousAppState);
        if (appState === this.previousAppState) {
            return;
        }

        if (this.previousAppState === 'active') {
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
            this.openAll();
            return;
        }

        this.closeAll();
    }
}

export default new WebsocketManager();
