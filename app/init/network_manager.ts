// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert} from 'react-native';
import DeviceInfo from 'react-native-device-info';

import {getOrCreateAPIClient} from '@mattermost/react-native-network-client';

import {Client} from '@client/rest';

import type {ServerCredential} from '@typings/credentials';

class NetworkManager {
    public clients: Record<string, Client> = {};

    private DEFAULT_CONFIG = {
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
        },
        sessionConfiguration: {
            allowsCellularAccess: true,
            waitsForConnectivity: true,
            timeoutIntervalForRequest: 30000,
            timeoutIntervalForResource: 30000,
            httpMaximumConnectionsPerHost: 10,
            cancelRequestsOnUnauthorized: true,
        },
        retryPolicyConfiguration: {
            type: 'exponential', // TODO: how do I used RetryTypes.EXPONENTIAL ?
            retryLimit: 2,
            exponentialBackoffBase: 2,
            exponentialBackoffScale: 0.5,
        },
        requestAdapterConfiguration: {
            bearerAuthTokenResponseHeader: 'token',
        },
    };

    public init = async (serverCredentials: ServerCredential[]) => {
        for await (const {serverUrl, token} of serverCredentials) {
            try {
                this.createClient(serverUrl, token);
            } catch(error) {
                console.log(error);
            }
        }
    }

    public invalidateClient = (serverUrl: string) => {
        //this.clients[serverUrl]?.client.invalidate();
        delete this.clients[serverUrl];
    }

    public getClient = (serverUrl: string) => {
        return this.clients[serverUrl] || this.createClient(serverUrl);
    }

    public createClient = async (serverUrl: string, token?: string) => {
        const config = await this.buildConfig(token);
        // TODO: pass in a clientErrorEventHandler
        const {client} = await getOrCreateAPIClient(serverUrl, config);
        this.clients[serverUrl] = new Client(client, serverUrl);
        return this.clients[serverUrl];
    }

    // TODO: Add locale here?
    private buildConfig = async (token?: string) => {
        const userAgent = await DeviceInfo.getUserAgent();
        const headers: Record<string, any> = {
            ...this.DEFAULT_CONFIG.headers,
            'User-Agent': userAgent,
        };
        if (token) {
            headers['Authorization'] = `BEARER ${token}`;
        }

        return {
            ...this.DEFAULT_CONFIG,
            headers,
        }
    }

    // TODO: typescript, APIClientErrorEventHandler and APIClientErrorEvent
    private clientErrorEventHandler = (event) => {
        Alert.alert(
            "Error",
            `Server: ${event.serverUrl}\nCode: ${event.errorCode}\nDesc: ${event.errorDescription}`
        );
    };
}

export default new NetworkManager();