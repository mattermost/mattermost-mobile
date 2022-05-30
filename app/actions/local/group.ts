// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchFilteredChannelGroups, fetchFilteredTeamGroups, fetchGroupsForAutocomplete} from '@actions/remote/groups';
import DatabaseManager from '@database/manager';
import {prepareGroupChannels, prepareGroups, prepareGroupTeams, queryGroupsByName, queryGroupsByNameInChannel, queryGroupsByNameInTeam} from '@queries/servers/group';

import type GroupModel from '@typings/database/models/servers/group';

export const searchGroupsByName = async (serverUrl: string, name: string, skipFetch = false): Promise<GroupModel[]> => {
    console.log('search groups by name...');
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        throw new Error(`${serverUrl} operator not found`);
    }

    console.log('queryiong...');
    const groups = (queryGroupsByName(operator.database, name).fetch());

    // await groups;
    console.log('groups?', groups);

    // No local result? Fetch from remote and try again
    if (!groups.length && !skipFetch) {
        await fetchGroupsForAutocomplete(serverUrl, name);
        return searchGroupsByName(serverUrl, name, true);
    }

    return groups;
};

export const searchGroupsByNameInTeam = async (serverUrl: string, name: string, teamId: string, skipFetch?: boolean): Promise<GroupModel[]> => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        throw new Error(`${serverUrl} operator not found`);
    }

    const groups = await queryGroupsByNameInTeam(operator.database, name, teamId).fetch();

    // No local result? Fetch from remote and try again
    if (!groups.length && !skipFetch) {
        const fetchedGroups = await fetchFilteredTeamGroups(serverUrl, name, teamId);

        if (fetchedGroups && Array.isArray(fetchedGroups) && fetchedGroups.length) {
            await storeGroupTeams(serverUrl, fetchedGroups, teamId);
            return searchGroupsByNameInTeam(serverUrl, name, teamId, true);
        }
    }

    return groups;
};

export const searchGroupsByNameInChannel = async (serverUrl: string, name: string, channelId: string, skipFetch?: boolean): Promise<GroupModel[]> => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        throw new Error(`${serverUrl} operator not found`);
    }

    const groups = await queryGroupsByNameInChannel(operator.database, name, channelId).fetch();

    // No local result? Fetch from remote and try again
    if (!groups.length && !skipFetch) {
        const fetchedGroups = await fetchFilteredChannelGroups(serverUrl, name, channelId);

        if (fetchedGroups && Array.isArray(fetchedGroups) && fetchedGroups.length) {
            return searchGroupsByNameInChannel(serverUrl, name, channelId, true);
        }
    }

    return groups;
};

/**
 * Store fetched groups locally
 *
 * @param serverUrl string - The Server URL
 * @param groups Group[] - The groups fetched from the API
 * @param prepareRecordsOnly boolean - Wether to only prepare records without saving
 */
export const storeGroups = async (serverUrl: string, groups: Group[], prepareRecordsOnly = false) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        throw new Error(`${serverUrl} operator not found`);
    }

    try {
        const preparedGroups = await prepareGroups(operator, groups);

        if (prepareRecordsOnly) {
            return preparedGroups;
        }

        if (preparedGroups.length) {
            operator.batchRecords(preparedGroups);
        }

        return {data: true};
    } catch (e) {
        return {error: e};
    }
};

/**
 * Store fetched groups locally
 *
 * @param serverUrl string - The Server URL
 * @param groups Group[] - The groups fetched from the API
 * @param prepareRecordsOnly boolean - Wether to only prepare records without saving
 */
export const storeGroupTeams = async (serverUrl: string, groupTeams: GroupTeam[], prepareRecordsOnly = false) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        throw new Error(`${serverUrl} operator not found`);
    }

    try {
        const preparedGroupTeams = await prepareGroupTeams(operator, groupTeams);

        if (prepareRecordsOnly) {
            return preparedGroupTeams;
        }

        if (preparedGroupTeams.length) {
            operator.batchRecords(preparedGroupTeams);
        }

        return {data: true};
    } catch (e) {
        return {error: e};
    }
};

/**
 * Store fetched groups locally
 *
 * @param serverUrl string - The Server URL
 * @param groups Group[] - The groups fetched from the API
 * @param prepareRecordsOnly boolean - Wether to only prepare records without saving
 */
export const storeGroupChannels = async (serverUrl: string, groupChannels: GroupChannel[], prepareRecordsOnly = false) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        throw new Error(`${serverUrl} operator not found`);
    }

    try {
        const preparedGroupChannels = await prepareGroupChannels(operator, groupChannels);

        if (prepareRecordsOnly) {
            return preparedGroupChannels;
        }

        if (preparedGroupChannels.length) {
            operator.batchRecords(preparedGroupChannels);
        }

        return {data: true};
    } catch (e) {
        return {error: e};
    }
};
