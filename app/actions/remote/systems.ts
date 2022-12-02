// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {storeConfigAndLicense, storeDataRetentionPolicies} from '@actions/local/systems';
import {forceLogoutIfNecessary} from '@actions/remote/session';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getCurrentUserId} from '@queries/servers/system';

import type ClientError from '@client/rest/error';

export type ConfigAndLicenseRequest = {
    config?: ClientConfig;
    license?: ClientLicense;
    error?: unknown;
}

export type DataRetentionPoliciesRequest = {
    globalPolicy?: GlobalDataRetentionPolicy;
    teamPolicies?: TeamDataRetentionPolicy[];
    channelPolicies?: ChannelDataRetentionPolicy[];
    error?: unknown;
}

export const fetchDataRetentionPolicy = async (serverUrl: string, fetchOnly = false): Promise<DataRetentionPoliciesRequest> => {
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

        const data = {
            globalPolicy,
            teamPolicies: teamPolicies as TeamDataRetentionPolicy[],
            channelPolicies: channelPolicies as ChannelDataRetentionPolicy[],
        };

        if (!fetchOnly) {
            await storeDataRetentionPolicies(serverUrl, data);
        }

        return data;
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
    policies: Array<TeamDataRetentionPolicy | ChannelDataRetentionPolicy> = [],
): Promise<{data?: Array<TeamDataRetentionPolicy | ChannelDataRetentionPolicy>; error?: unknown}> => {
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
    let data;
    if (isChannel) {
        data = await client.getChannelDataRetentionPolicies(currentUserId, page);
    } else {
        data = await client.getTeamDataRetentionPolicies(currentUserId, page);
    }
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
