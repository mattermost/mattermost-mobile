// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {logError} from '@actions/remote/error';
import {forceLogoutIfNecessary} from '@actions/remote/general';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {getServerCredentials} from '@init/credentials';
import NetworkManager from '@init/network_manager';

export type ConfigAndLicenseRequest = {
    config?: ClientConfig;
    license?: ClientLicense;
    error?: never;
}

export const fetchDataRetentionPolicy = async (serverUrl: string) => {
    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    let data = {};
    try {
        data = await client.getDataRetentionPolicy();
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error);

        logError(error);
        return {error};
    }

    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (operator) {
        const systems: IdValue[] = [{
            id: SYSTEM_IDENTIFIERS.DATA_RETENTION_POLICIES,
            value: JSON.stringify(data),
        }];

        operator.handleSystem({systems, prepareRecordsOnly: false}).
            catch((error) => {
                // eslint-disable-next-line no-console
                console.log('An error ocurred while saving data retention policies', error);
            });
    }

    return data;
};

export const fetchConfigAndLicense = async (serverUrl: string, fetchOnly = false): Promise<ConfigAndLicenseRequest> => {
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
        if (!fetchOnly) {
            const credentials = await getServerCredentials(serverUrl);
            const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
            if (credentials && operator) {
                const systems: IdValue[] = [{
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
        }

        return {config, license};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};
