// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {getServerCredentials} from '@init/credentials';
import NetworkManager from '@init/network_manager';

import type {ClientResponse} from '@mattermost/react-native-network-client';

import type {RawSystem} from '@typings/database/database';

export const doPing = async (serverUrl: string) => {
    const client = await NetworkManager.createClient(serverUrl);

    const certificateError = {
        id: 'mobile.server_requires_client_certificate',
        defaultMessage: 'Server required client certificate for authentication.',
    };

    const pingError = {
        id: 'mobile.server_ping_failed',
        defaultMessage: 'Cannot connect to the server. Please check your server URL and internet connection.',
    };

    let response: ClientResponse;
    try {
        response = await client.ping();

        if (response.code === 401) {
            // Don't invalidate the client since we want to eventually
            // import a certificate with client.importClientP12()
            // if for some reason cert is not imported do invalidate the client then.
            return {error: {intl: certificateError}};
        }

        if (!response.ok) {
            NetworkManager.invalidateClient(serverUrl);
            return {error: {intl: pingError}};
        }
    } catch (error) {
        NetworkManager.invalidateClient(serverUrl);
        return {error};
    }

    return {error: undefined};
};

export const fetchConfigAndLicense = async (serverUrl: string) => {
    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const [config, license] = await Promise.all<ClientConfig, ClientLicense>([
            client.getClientConfigOld(),
            client.getClientLicenseOld(),
        ]);

        // If we have credentials for this server then update the values in the database
        const credentials = await getServerCredentials(serverUrl);
        const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
        if (credentials && operator) {
            const systems: RawSystem[] = [{
                id: SYSTEM_IDENTIFIERS.CONFIG,
                value: JSON.stringify(config),
            }, {
                id: SYSTEM_IDENTIFIERS.LICENSE,
                value: JSON.stringify(license),
            }];

            operator.handleSystem({systems, prepareRecordsOnly: false}).
                catch((error) => {
                    // eslint-disable-next-line no-console
                    console.log('An error ocurred while saving config & license', error);
                });
        }

        return {config, license};
    } catch (error) {
        return {error};
    }
};
