// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetInfo, {NetInfoState} from '@react-native-community/netinfo';
import {AppState, AppStateStatus} from 'react-native';

import {setCurrentUserStatusOffline} from '@actions/local/user';
import {handleClose, handleEvent, handleFirstConnect, handleReconnect} from '@actions/websocket';
import WebSocketClient from '@app/client/websocket';
import {queryWebSocketLastDisconnected} from '@app/queries/servers/system';
import DatabaseManager from '@database/manager';

import type {ServerCredential} from '@typings/credentials';

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

        client.setFirstConnectCallback(() => this.onFirstConnect(serverURL)); // TODO think about reconnect
        client.setEventCallback((evt: any) => handleEvent(serverURL, evt));

        //client.setMissedEventsCallback(() => {})
        client.setReconnectCallback(() => handleReconnect(serverURL));
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

        // TODO: Start periodic status updates
        handleFirstConnect(serverURL);
    }

    private onWebsocketClose = async (serverURL: string, connectFailCount: number, lastDisconnect: number) => {
        console.log('WSM: on websocket close');
        console.log(connectFailCount);
        if (connectFailCount <= 1) { // First fail
            console.log('STORE LAST DISCONNECT', lastDisconnect);
            await setCurrentUserStatusOffline(serverURL);
            await handleClose(serverURL, lastDisconnect);

            // TODO: Stop periodic status updates
        }
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
