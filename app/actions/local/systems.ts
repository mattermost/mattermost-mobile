// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import deepEqual from 'deep-equal';

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {getServerCredentials} from '@init/credentials';
import {getCommonSystemValues} from '@queries/servers/system';
import {logError} from '@utils/log';

export async function storeConfigAndLicense(serverUrl: string, config: ClientConfig, license: ClientLicense) {
    try {
        // If we have credentials for this server then update the values in the database
        const credentials = await getServerCredentials(serverUrl);
        if (credentials) {
            const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            const current = await getCommonSystemValues(operator.database);
            const systems: IdValue[] = [];
            if (!deepEqual(config, current.config)) {
                systems.push({
                    id: SYSTEM_IDENTIFIERS.CONFIG,
                    value: JSON.stringify(config),
                });
            }

            if (!deepEqual(license, current.license)) {
                systems.push({
                    id: SYSTEM_IDENTIFIERS.LICENSE,
                    value: JSON.stringify(license),
                });
            }

            if (systems.length) {
                await operator.handleSystem({systems, prepareRecordsOnly: false});
            }
        }
    } catch (error) {
        logError('An error occurred while saving config & license', error);
    }
}
