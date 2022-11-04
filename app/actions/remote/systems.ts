// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {storeConfigAndLicense} from '@actions/local/systems';
import {forceLogoutIfNecessary} from '@actions/remote/session';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getCurrentUserId} from '@queries/servers/system';
import {logError} from '@utils/log';

import type ClientError from '@client/rest/error';

export type ConfigAndLicenseRequest = {
    config?: ClientConfig;
    license?: ClientLicense;
    error?: unknown;
}

export const fetchDataRetentionPolicy = async (serverUrl: string) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const {data: globalPolicy, error: globalPolicyError} = await fetchGlobalDataRetentionPolicy(serverUrl);
        const {data: teamPolicies, error: teamPoliciesError} = await fetchAllGranularDataRetentionPolicies(serverUrl);
        const {data: channelPolicies, error: channelPoliciesError} = await fetchAllGranularDataRetentionPolicies(serverUrl, true);

        const hasError = globalPolicyError || teamPoliciesError || channelPoliciesError;
        if (hasError) {
            return hasError;
        }
        const systems: IdValue[] = [{
            id: SYSTEM_IDENTIFIERS.DATA_RETENTION_POLICIES,
            value: JSON.stringify(globalPolicy),
        }, {
            id: SYSTEM_IDENTIFIERS.GRANULAR_DATA_RETENTION_POLICIES,
            value: JSON.stringify({
                team: teamPolicies,
                channel: channelPolicies,
            }),
        }];

        await operator.handleSystem({systems, prepareRecordsOnly: false}).
            catch((error) => {
                logError('An error occurred while saving data retention policies', error);
            });

        return {globalPolicy, teamPolicies, channelPolicies};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientError);
        return {error};
    }
};

export const fetchGlobalDataRetentionPolicy = async (serverUrl: string): Promise<{data?: GlobalDataRetentionPolicy; error?: unknown}> => {
    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const data = await client.getGlobalDataRetentionPolicy();
        return {data};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientError);
        return {error};
    }
};

export const fetchAllGranularDataRetentionPolicies = async (
    serverUrl: string,
    isChannel = false,
    page = 0,
    policies: TeamDataRetentionPolicy[] | ChannelDataRetentionPolicy[] = [],
): Promise<{data?: TeamDataRetentionPolicy[] | ChannelDataRetentionPolicy[]; error?: unknown}> => {
    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const {database} = operator;

    const currentUserId = await getCurrentUserId(database);
    const api = isChannel ? 'getChannelDataRetentionPolicies' : 'getTeamDataRetentionPolicies';
    const data = await client[api](currentUserId, page);
    policies.push(...data.policies);
    if (policies.length < data.total_count) {
        await fetchAllGranularDataRetentionPolicies(serverUrl, isChannel, page + 1, policies);
    }
    return {data: policies};
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
            await storeConfigAndLicense(serverUrl, config, license);
        }

        return {config, license};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientError);
        return {error};
    }
};
