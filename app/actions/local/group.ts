// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchFilteredChannelGroups, fetchFilteredTeamGroups, fetchGroupsForAutocomplete} from '@actions/remote/groups';
import DatabaseManager from '@database/manager';
import {queryGroupsByName, queryGroupsByNameInChannel, queryGroupsByNameInTeam} from '@queries/servers/group';
import {logError} from '@utils/log';

import type GroupModel from '@typings/database/models/servers/group';

export const searchGroupsByName = async (serverUrl: string, name: string): Promise<GroupModel[]> => {
    let database;

    try {
        database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;
    } catch (e) {
        logError('searchGroupsByName - DB Error', e);
        return [];
    }

    try {
        const groups = await fetchGroupsForAutocomplete(serverUrl, name);

        if (groups && Array.isArray(groups)) {
            return groups;
        }
        throw groups.error;
    } catch (e) {
        logError('searchGroupsByName - ERROR', e);
        return queryGroupsByName(database, name).fetch();
    }
};

export const searchGroupsByNameInTeam = async (serverUrl: string, name: string, teamId: string): Promise<GroupModel[]> => {
    let database;

    try {
        database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;
    } catch (e) {
        // eslint-disable-next-line no-console
        console.log('searchGroupsByNameInTeam - DB Error', e);
        return [];
    }

    try {
        const groups = await fetchFilteredTeamGroups(serverUrl, name, teamId);

        if (groups && Array.isArray(groups)) {
            return groups;
        }
        throw groups.error;
    } catch (e) {
        logError('searchGroupsByNameInTeam - ERROR', e);
        return queryGroupsByNameInTeam(database, name, teamId).fetch();
    }
};

export const searchGroupsByNameInChannel = async (serverUrl: string, name: string, channelId: string): Promise<GroupModel[]> => {
    let database;

    try {
        database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;
    } catch (e) {
        logError('searchGroupsByNameInChannel - DB Error', e);
        return [];
    }

    try {
        const groups = await fetchFilteredChannelGroups(serverUrl, name, channelId);

        if (groups && Array.isArray(groups)) {
            return groups;
        }
        throw groups.error;
    } catch (e) {
        logError('searchGroupsByNameInChannel - ERROR', e);
        return queryGroupsByNameInChannel(database, name, channelId).fetch();
    }
};

/**
 * Store fetched groups locally
 *
 * @param serverUrl string - The Server URL
 * @param groups Group[] - The groups fetched from the API
 * @param prepareRecordsOnly boolean - Only prepares records
 */
export const storeGroups = async (serverUrl: string, groups: Group[], prepareRecordsOnly = false) => {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        return operator.handleGroups({groups, prepareRecordsOnly});
    } catch (e) {
        logError('storeGroups', e);
        return {error: e};
    }
};

/**
 * Store fetched group memberships locally for member
 *
 * @param serverUrl string - The Server URL
 * @param groups Group[] - The groups fetched from the API
 * @param userId string - The member (user) to associate the groups with
 * @param prepareRecordsOnly boolean - Only prepares records
 */
export const storeGroupMembershipsForMember = async (serverUrl: string, groups: Group[], userId: string, prepareRecordsOnly = false) => {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        return operator.handleGroupMembershipsForMember({userId, groups, prepareRecordsOnly});
    } catch (e) {
        logError('storeGroupMembershipsForMember', e);
        return {error: e};
    }
};
