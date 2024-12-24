// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {storeConfigAndLicense, storeDataRetentionPolicies} from '@actions/local/systems';
import {forceLogoutIfNecessary} from '@actions/remote/session';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getCurrentUserId} from '@queries/servers/system';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

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

export const fetchDataRetentionPolicy = async (serverUrl: string, fetchOnly = false, groupLabel?: RequestGroupLabel): Promise<DataRetentionPoliciesRequest> => {
    const {data: globalPolicy, error: globalPolicyError} = await fetchGlobalDataRetentionPolicy(serverUrl, groupLabel);
    const {data: teamPolicies, error: teamPoliciesError} = await fetchAllGranularDataRetentionPolicies(serverUrl, undefined, undefined, undefined, groupLabel);
    const {data: channelPolicies, error: channelPoliciesError} = await fetchAllGranularDataRetentionPolicies(serverUrl, true);

    const error = globalPolicyError || teamPoliciesError || channelPoliciesError;
    if (error) {
        return {error};
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
};

export const fetchGlobalDataRetentionPolicy = async (serverUrl: string, groupLabel?: RequestGroupLabel): Promise<{data?: GlobalDataRetentionPolicy; error?: unknown}> => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const data = await client.getGlobalDataRetentionPolicy(groupLabel);
        return {data};
    } catch (error) {
        logDebug('error on fetchGlobalDataRetentionPolicy', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const fetchAllGranularDataRetentionPolicies = async (
    serverUrl: string,
    isChannel = false,
    page = 0,
    policies: Array<TeamDataRetentionPolicy | ChannelDataRetentionPolicy> = [],
    groupLabel?: RequestGroupLabel,
): Promise<{data?: Array<TeamDataRetentionPolicy | ChannelDataRetentionPolicy>; error?: unknown}> => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const currentUserId = await getCurrentUserId(database);
        let data;
        if (isChannel) {
            data = await client.getChannelDataRetentionPolicies(currentUserId, page, undefined, groupLabel);
        } else {
            data = await client.getTeamDataRetentionPolicies(currentUserId, page, undefined, groupLabel);
        }
        policies.push(...data.policies);
        if (policies.length < data.total_count) {
            await fetchAllGranularDataRetentionPolicies(serverUrl, isChannel, page + 1, policies, groupLabel);
        }
        return {data: policies};
    } catch (error) {
        logDebug('error on fetchAllGranularDataRetentionPolicies', getFullErrorMessage(error));
        return {error};
    }
};

export const fetchConfigAndLicense = async (serverUrl: string, fetchOnly = false, groupLabel?: RequestGroupLabel): Promise<ConfigAndLicenseRequest> => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const [config, license]: [ClientConfig, ClientLicense] = await Promise.all([
            client.getClientConfigOld(groupLabel),
            client.getClientLicenseOld(groupLabel),
        ]);

        if (!fetchOnly) {
            await storeConfigAndLicense(serverUrl, config, license);
        }

        return {config, license};
    } catch (error) {
        logDebug('error on fetchConfigAndLicense', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};
