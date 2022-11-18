// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import deepEqual from 'deep-equal';

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {getServerCredentials} from '@init/credentials';
import {getConfig, getLicense} from '@queries/servers/system';
import {logError} from '@utils/log';

export async function storeConfigAndLicense(serverUrl: string, config: ClientConfig, license: ClientLicense) {
    try {
        // If we have credentials for this server then update the values in the database
        const credentials = await getServerCredentials(serverUrl);
        if (credentials) {
            const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            const currentLicense = await getLicense(database);
            const systems: IdValue[] = [];

            if (!deepEqual(license, currentLicense)) {
                systems.push({
                    id: SYSTEM_IDENTIFIERS.LICENSE,
                    value: JSON.stringify(license),
                });
            }

            if (systems.length) {
                await operator.handleSystem({systems, prepareRecordsOnly: false});
            }

            await storeConfig(serverUrl, config);
        }
    } catch (error) {
        logError('An error occurred while saving config & license', error);
    }
}

export async function storeConfig(serverUrl: string, config: ClientConfig | undefined, prepareRecordsOnly = false) {
    if (!config) {
        return [];
    }

    try {
        const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const currentConfig = await getConfig(database);
        const configsToUpdate: IdValue[] = [];
        const configsToDelete: IdValue[] = [];

        let k: keyof ClientConfig;
        for (k in config) {
            if (currentConfig?.[k] !== config[k]) {
                configsToUpdate.push({
                    id: k,
                    value: config[k],
                });
            }
        }
        for (k in currentConfig) {
            if (config[k] === undefined) {
                configsToDelete.push({
                    id: k,
                    value: currentConfig[k],
                });
            }
        }

        if (configsToDelete.length || configsToUpdate.length) {
            return operator.handleConfigs({configs: configsToUpdate, configsToDelete, prepareRecordsOnly});
        }
    } catch (error) {
        logError('storeConfig', error);
    }
    return [];
}

export async function setLastServerVersionCheck(serverUrl: string, reset = false) {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handleSystem({
            systems: [{
                id: SYSTEM_IDENTIFIERS.LAST_SERVER_VERSION_CHECK,
                value: reset ? 0 : Date.now(),
            }],
            prepareRecordsOnly: false,
        });
    } catch (error) {
        logError('setLastServerVersionCheck', error);
    }
}

export async function dismissAnnouncement(serverUrl: string, announcementText: string) {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LAST_DISMISSED_BANNER, value: announcementText}], prepareRecordsOnly: false});
    } catch (error) {
        logError('An error occurred while dismissing an announcement', error);
    }
}
