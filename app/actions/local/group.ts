// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchFilteredChannelGroups, fetchFilteredTeamGroups, fetchGroupsForAutocomplete} from '@actions/remote/groups';
import DatabaseManager from '@database/manager';
import {prepareGroups, queryGroupsByName, queryGroupsByNameInChannel, queryGroupsByNameInTeam} from '@queries/servers/group';

import type GroupModel from '@typings/database/models/servers/group';

export const searchGroupsByName = async (serverUrl: string, name: string): Promise<GroupModel[]> => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        throw new Error(`${serverUrl} operator not found`);
    }

    try {
        const groups = await fetchGroupsForAutocomplete(serverUrl, name);

        if (groups && Array.isArray(groups)) {
            return groups;
        }
        throw groups.error;
    } catch (e) {
        // eslint-disable-next-line no-console
        console.log('searchGroupsByName - ERROR', e);
        return queryGroupsByName(operator.database, name).fetch();
    }
};

export const searchGroupsByNameInTeam = async (serverUrl: string, name: string, teamId: string): Promise<GroupModel[]> => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        throw new Error(`${serverUrl} operator not found`);
    }

    try {
        const groups = await fetchFilteredTeamGroups(serverUrl, name, teamId);

        if (groups && Array.isArray(groups)) {
            return groups;
        }
        throw groups.error;
    } catch (e) {
        // eslint-disable-next-line no-console
        console.log('searchGroupsByNameInTeam - ERROR', e);
        return queryGroupsByNameInTeam(operator.database, name, teamId).fetch();
    }
};

export const searchGroupsByNameInChannel = async (serverUrl: string, name: string, channelId: string): Promise<GroupModel[]> => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        throw new Error(`${serverUrl} operator not found`);
    }

    try {
        const groups = await fetchFilteredChannelGroups(serverUrl, name, channelId);

        if (groups && Array.isArray(groups)) {
            return groups;
        }
        throw groups.error;
    } catch (e) {
        // eslint-disable-next-line no-console
        console.log('searchGroupsByNameInChannel - ERROR', e);
        return queryGroupsByNameInChannel(operator.database, name, channelId).fetch();
    }
};

/**
 * Store fetched groups locally
 *
 * @param serverUrl string - The Server URL
 * @param groups Group[] - The groups fetched from the API
 * @param prepareRecordsOnly boolean - Wether to only prepare records without saving
 */
export const storeGroups = async (serverUrl: string, groups: Group[]) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        throw new Error(`${serverUrl} operator not found`);
    }

    try {
        const preparedGroups = await prepareGroups(operator, groups);

        if (preparedGroups.length) {
            operator.batchRecords(preparedGroups);
        }

        return preparedGroups;
    } catch (e) {
        return {error: e};
    }
};

