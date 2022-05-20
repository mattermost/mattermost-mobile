// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Emm from '@mattermost/react-native-emm';
import {
    APIClientErrorEvent,
    APIClientErrorEventHandler,
    getOrCreateAPIClient,
    RetryTypes,
} from '@mattermost/react-native-network-client';
import {DeviceEventEmitter} from 'react-native';
import DeviceInfo from 'react-native-device-info';

import LocalConfig from '@assets/config.json';
import {Client} from '@client/rest';
import * as ClientConstants from '@client/rest/constants';
import {CERTIFICATE_ERRORS} from '@constants/network';
import ManagedApp from '@init/managed_app';
import {getCSRFFromCookie} from '@utils/security';

import type {ServerCredential} from '@typings/credentials';

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
            type: RetryTypes.EXPONENTIAL_RETRY,
            retryLimit: 3,
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
                await this.createClient(serverUrl, token);
            } catch (error) {
                console.log('NetworkManager init error', error); //eslint-disable-line no-console
            }
        }
    };

    public invalidateClient = (serverUrl: string) => {
        this.clients[serverUrl]?.invalidate();
        delete this.clients[serverUrl];
    };

    public getClient = (serverUrl: string) => {
        const client = this.clients[serverUrl];
        if (!client) {
            throw new Error(`${serverUrl} client not found`);
        }

        return client;
    };

    public createClient = async (serverUrl: string, bearerToken?: string) => {
        const config = await this.buildConfig();
        const {client} = await getOrCreateAPIClient(serverUrl, config, this.clientErrorEventHandler);
        const csrfToken = await getCSRFFromCookie(serverUrl);
        this.clients[serverUrl] = new Client(client, serverUrl, bearerToken, csrfToken);

        return this.clients[serverUrl];
    };

    private buildConfig = async () => {
        const userAgent = await DeviceInfo.getUserAgent();
        const headers: Record<string, string> = {
            ...this.DEFAULT_CONFIG.headers,
            [ClientConstants.HEADER_USER_AGENT]: userAgent,
        };

        const config = {
            ...this.DEFAULT_CONFIG,
            headers,
        };

        if (ManagedApp.enabled) {
            const managedConfig = Emm.getManagedConfig<ManagedConfig>();
            if (managedConfig?.useVPN === 'true') {
                config.sessionConfiguration.waitsForConnectivity = true;
            }

            if (managedConfig?.timeoutVPN) {
                config.sessionConfiguration.timeoutIntervalForResource = parseInt(managedConfig.timeoutVPN, 10);
            }
        }

        return config;
    };

    private clientErrorEventHandler: APIClientErrorEventHandler = (event: APIClientErrorEvent) => {
        if (CLIENT_CERTIFICATE_IMPORT_ERROR_CODES.includes(event.errorCode)) {
            DeviceEventEmitter.emit(CERTIFICATE_ERRORS.CLIENT_CERTIFICATE_IMPORT_ERROR, event.serverUrl);
        } else if (CLIENT_CERTIFICATE_MISSING_ERROR_CODE === event.errorCode) {
            DeviceEventEmitter.emit(CERTIFICATE_ERRORS.CLIENT_CERTIFICATE_MISSING, event.serverUrl);
        }
    };
}

export default new NetworkManager();
