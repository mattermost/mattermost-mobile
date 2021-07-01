// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert} from 'react-native';
import DeviceInfo from 'react-native-device-info';

import Emm from '@mattermost/react-native-emm';
import {getOrCreateAPIClient} from '@mattermost/react-native-network-client';

import ManagedApp from '@app/init/managed_app';
import LocalConfig from '@assets/config';
import {Client} from '@client/rest';
import * as ClientConstants from '@client/rest/constants';

import type {ServerCredential} from '@typings/credentials';

// TODO: Should these constants be part of react-native-network-library?
const CLIENT_CERTIFICATE_IMPORT_ERROR_CODES = [-103, -104, -105, -108];
const CLIENT_CERTIFICATE_MISSING_ERROR_CODE = -200;

class NetworkManager {
    private clients: Record<string, Client> = {};

    private DEFAULT_CONFIG = {
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            ...LocalConfig.CustomRequestHeaders,
        },
        sessionConfiguration: {
            allowsCellularAccess: true,
            waitsForConnectivity: false,
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
        this.clients[serverUrl]?.client.invalidate();
        delete this.clients[serverUrl];
    }

    public getClient = (serverUrl: string) => {
        const client = this.clients[serverUrl];
        if (!client) {
            throw new Error(`${serverUrl} client not found`);
        }

        return client;
    }

    public createClient = async (serverUrl: string, token?: string) => {
        const config = await this.buildConfig(token);
        const {client} = await getOrCreateAPIClient(serverUrl, config, this.clientErrorEventHandler);
        this.clients[serverUrl] = new Client(client, serverUrl);

        return this.clients[serverUrl];
    }

    private buildConfig = async (token?: string) => {
        const userAgent = await DeviceInfo.getUserAgent();
        const headers: Record<string, any> = {
            ...this.DEFAULT_CONFIG.headers,
            [ClientConstants.HEADER_USER_AGENT]: userAgent,
        };
        if (token) {
            headers[ClientConstants.HEADER_AUTH] = `${ClientConstants.HEADER_BEARER} ${token}`;
        }

        let config = {
            ...this.DEFAULT_CONFIG,
            headers,
        }

        if (ManagedApp.enabled) {
            const managedConfig = await Emm.getManagedConfig();
            if (managedConfig?.useVPN === 'true') {
                config.sessionConfiguration.waitsForConnectivity = true;
            }

            if (managedConfig?.timeoutVPN) {
                config.sessionConfiguration.timeoutIntervalForResource = parseInt(managedConfig.timeoutVPN, 10);
            }
        }

        return config;
    }

    // TODO: typescript, APIClientErrorEventHandler and APIClientErrorEvent
    private clientErrorEventHandler = (event) => {
        // TODO: handle other errors
        if (CLIENT_CERTIFICATE_IMPORT_ERROR_CODES.includes(event.errorCode)) {
            // Emit CLIENT_CERTIFICATE_IMPORT_ERROR event
        } else if (CLIENT_CERTIFICATE_MISSING_ERROR_CODE === event.errorCode) {
            // Emit CLIENT_CERTIFICATE_MISSING event
        }
    };
}

export default new NetworkManager();