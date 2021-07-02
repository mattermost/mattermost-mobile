// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {logError} from '@actions/remote/error';
import {forceLogoutIfNecessary} from '@actions/remote/user';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import NetworkManager from '@init/network_manager';

import type {RawSystem} from '@typings/database/database';

export const getDataRetentionPolicy = async (serverUrl: string) => {
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
        const systems: RawSystem[] = [{
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
