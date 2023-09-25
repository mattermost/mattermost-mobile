// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Emm from '@mattermost/react-native-emm';
import {
    type APIClientErrorEvent,
    type APIClientErrorEventHandler,
    getOrCreateAPIClient,
    RetryTypes,
    type APIClientConfiguration,
} from '@mattermost/react-native-network-client';
import {Alert, DeviceEventEmitter} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import urlParse from 'url-parse';

import LocalConfig from '@assets/config.json';
import {Client} from '@client/rest';
import * as ClientConstants from '@client/rest/constants';
import ClientError from '@client/rest/error';
import {CERTIFICATE_ERRORS} from '@constants/network';
import {DEFAULT_LOCALE, getLocalizedMessage, t} from '@i18n';
import ManagedApp from '@init/managed_app';
import {logDebug, logError} from '@utils/log';
import {getCSRFFromCookie} from '@utils/security';

const CLIENT_CERTIFICATE_IMPORT_ERROR_CODES = [-103, -104, -105, -108];
const CLIENT_CERTIFICATE_MISSING_ERROR_CODE = -200;
const SERVER_CERTIFICATE_INVALID = -299;

class NetworkManager {
    private clients: Record<string, Client> = {};

    private DEFAULT_CONFIG: APIClientConfiguration = {
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            ...LocalConfig.CustomRequestHeaders,
        },
        sessionConfiguration: {
            allowsCellularAccess: true,
            waitsForConnectivity: false,
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
                logError('NetworkManager init error', error);
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
        try {
            const {client} = await getOrCreateAPIClient(serverUrl, config, this.clientErrorEventHandler);
            const csrfToken = await getCSRFFromCookie(serverUrl);
            this.clients[serverUrl] = new Client(client, serverUrl, bearerToken, csrfToken);
        } catch (error) {
            throw new ClientError(serverUrl, {
                message: 'Can’t find this server. Check spelling and URL format.',
                intl: {
                    id: 'apps.error.network.no_server',
                    defaultMessage: 'Can’t find this server. Check spelling and URL format.',
                },
                url: serverUrl,
                details: error,
            });
        }

        return this.clients[serverUrl];
    };

    private buildConfig = async () => {
        const userAgent = `Mattermost Mobile/${DeviceInfo.getVersion()}+${DeviceInfo.getBuildNumber()} (${DeviceInfo.getSystemName()}; ${DeviceInfo.getSystemVersion()}; ${DeviceInfo.getModel()})`;
        const managedConfig = ManagedApp.enabled ? Emm.getManagedConfig<ManagedConfig>() : undefined;
        const headers: Record<string, string> = {
            [ClientConstants.HEADER_USER_AGENT]: userAgent,
            ...this.DEFAULT_CONFIG.headers,
        };

        const config = {
            ...this.DEFAULT_CONFIG,
            sessionConfiguration: {
                ...this.DEFAULT_CONFIG.sessionConfiguration,
                timeoutIntervalForRequest: managedConfig?.timeout ? parseInt(managedConfig.timeout, 10) : this.DEFAULT_CONFIG.sessionConfiguration?.timeoutIntervalForRequest,
                timeoutIntervalForResource: managedConfig?.timeoutVPN ? parseInt(managedConfig.timeoutVPN, 10) : this.DEFAULT_CONFIG.sessionConfiguration?.timeoutIntervalForResource,
                waitsForConnectivity: managedConfig?.useVPN === 'true',
            },
            headers,
        };

        return config;
    };

    private clientErrorEventHandler: APIClientErrorEventHandler = (event: APIClientErrorEvent) => {
        if (CLIENT_CERTIFICATE_IMPORT_ERROR_CODES.includes(event.errorCode)) {
            DeviceEventEmitter.emit(CERTIFICATE_ERRORS.CLIENT_CERTIFICATE_IMPORT_ERROR, event.serverUrl);
        } else if (CLIENT_CERTIFICATE_MISSING_ERROR_CODE === event.errorCode) {
            DeviceEventEmitter.emit(CERTIFICATE_ERRORS.CLIENT_CERTIFICATE_MISSING, event.serverUrl);
        } else if (SERVER_CERTIFICATE_INVALID === event.errorCode) {
            logDebug('Invalid SSL certificate:', event.errorDescription);
            const parsed = urlParse(event.serverUrl);
            Alert.alert(
                getLocalizedMessage(DEFAULT_LOCALE, t('server.invalid.certificate.title'), 'Invalid SSL certificate'),
                getLocalizedMessage(
                    DEFAULT_LOCALE,
                    t('server.invalid.certificate.description'),
                    'The certificate for this server is invalid.\nYou might be connecting to a server that is pretending to be “{hostname}” which could put your confidential information at risk.',
                ).replace('{hostname}', parsed.hostname),
            );
        }
    };
}

export default new NetworkManager();
