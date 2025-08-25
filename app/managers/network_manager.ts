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
import {nativeApplicationVersion, nativeBuildVersion} from 'expo-application';
import {modelName, osName, osVersion} from 'expo-device';
import {defineMessages} from 'react-intl';
import {Alert, DeviceEventEmitter} from 'react-native';
import urlParse from 'url-parse';

import LocalConfig from '@assets/config.json';
import {Client} from '@client/rest';
import * as ClientConstants from '@client/rest/constants';
import ClientError from '@client/rest/error';
import {CERTIFICATE_ERRORS} from '@constants/network';
import ManagedApp from '@init/managed_app';
import {toMilliseconds} from '@utils/datetime';
import {getIntlShape} from '@utils/general';
import {logDebug, logError} from '@utils/log';
import {getCSRFFromCookie} from '@utils/security';

const CLIENT_CERTIFICATE_IMPORT_ERROR_CODES = [-103, -104, -105, -108];
const CLIENT_CERTIFICATE_MISSING_ERROR_CODE = -200;
const SERVER_CERTIFICATE_INVALID = -299;
const SERVER_TRUST_EVALUATION_FAILED = -298;
let showingServerTrustAlert = false;

const messages = defineMessages({
    invalidSslTitle: {
        id: 'server.invalid.certificate.title',
        defaultMessage: 'Invalid SSL certificate',
    },
    invalidSslDescription: {
        id: 'server.invalid.certificate.description',
        defaultMessage: 'The certificate for this server is invalid.\nYou might be connecting to a server that is pretending to be “{hostname}” which could put your confidential information at risk.',
    },
    invalidPinningTitle: {
        id: 'server.invalid.pinning.title',
        defaultMessage: 'Invalid pinned SSL certificate',
    },
});

class NetworkManagerSingleton {
    private clients: Record<string, Client> = {};

    private intl = getIntlShape();

    private DEFAULT_CONFIG: APIClientConfiguration = {
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            ...LocalConfig.CustomRequestHeaders,
        },
        sessionConfiguration: {
            allowsCellularAccess: true,
            waitsForConnectivity: false,
            httpMaximumConnectionsPerHost: 100,
            cancelRequestsOnUnauthorized: true,
            collectMetrics: false,
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
        for await (const {serverUrl, token, preauthSecret} of serverCredentials) {
            try {
                await this.createClient(serverUrl, token, preauthSecret);
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

    public createClient = async (serverUrl: string, bearerToken?: string, preauthSecret?: string) => {
        const config = await this.buildConfig(preauthSecret);

        try {
            const {client} = await getOrCreateAPIClient(serverUrl, config, this.clientErrorEventHandler);
            const csrfToken = await getCSRFFromCookie(serverUrl);
            this.clients[serverUrl] = new Client(client, serverUrl, bearerToken, csrfToken, preauthSecret);
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

    private buildConfig = async (preauthSecret?: string) => {
        const userAgent = `Mattermost Mobile/${nativeApplicationVersion}+${nativeBuildVersion} (${osName}; ${osVersion}; ${modelName})`;
        const managedConfig = ManagedApp.enabled ? Emm.getManagedConfig<ManagedConfig>() : undefined;
        const headers: Record<string, string> = {
            [ClientConstants.HEADER_USER_AGENT]: userAgent,
            ...(preauthSecret ? {[ClientConstants.HEADER_X_MATTERMOST_PREAUTH_SECRET]: preauthSecret} : {}),
            ...this.DEFAULT_CONFIG.headers,
        };

        const config = {
            ...this.DEFAULT_CONFIG,
            sessionConfiguration: {
                ...this.DEFAULT_CONFIG.sessionConfiguration,
                timeoutIntervalForRequest: managedConfig?.timeout ? parseInt(managedConfig.timeout, 10) : this.DEFAULT_CONFIG.sessionConfiguration?.timeoutIntervalForRequest,
                timeoutIntervalForResource: managedConfig?.timeoutVPN ? parseInt(managedConfig.timeoutVPN, 10) : this.DEFAULT_CONFIG.sessionConfiguration?.timeoutIntervalForResource,
                waitsForConnectivity: managedConfig?.useVPN === 'true',
                collectMetrics: LocalConfig.CollectNetworkMetrics,
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
                this.intl.formatMessage(messages.invalidSslTitle),
                this.intl.formatMessage(messages.invalidSslDescription, {hostname: parsed.hostname}),
            );
        } else if (SERVER_TRUST_EVALUATION_FAILED === event.errorCode && !showingServerTrustAlert) {
            logDebug('Invalid SSL Pinning:', event.errorDescription);
            showingServerTrustAlert = true;
            Alert.alert(
                this.intl.formatMessage(messages.invalidPinningTitle),
                event.errorDescription,
                [{
                    text: this.intl.formatMessage({id: 'server_upgrade.dismiss', defaultMessage: 'Dismiss'}),
                    onPress: () => {
                        setTimeout(() => {
                            showingServerTrustAlert = false;
                        }, toMilliseconds({hours: 23}));
                    },
                }],
            );
        }
    };
}

const NetworkManager = new NetworkManagerSingleton();
export default NetworkManager;
