// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {storeConfigAndLicense} from '@actions/local/systems';
import {forceLogoutIfNecessary} from '@actions/remote/session';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {logError} from '@utils/log';

import type ClientError from '@client/rest/error';

export type ConfigAndLicenseRequest = {
    config?: ClientConfig;
    license?: ClientLicense;
    error?: unknown;
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
        forceLogoutIfNecessary(serverUrl, error as ClientError);
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
                logError('An error occurred while saving data retention policies', error);
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
        const [config, license]: [ClientConfig, ClientLicense] = await Promise.all([
            client.getClientConfigOld(),
            client.getClientLicenseOld(),
        ]);

        if (!fetchOnly) {
            storeConfigAndLicense(serverUrl, config, license);
        }

        return {config, license};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientError);
        return {error};
    }
};
