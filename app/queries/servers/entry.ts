// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';

import {prepareCategoriesAndCategoriesChannels} from './categories';
import {prepareAllMyChannels, prepareDeleteChannel, queryAllChannels, queryChannelsById} from './channel';
import {prepareMyPreferences} from './preference';
import {resetLastFullSync} from './system';
import {prepareDeleteTeam, prepareMyTeams, queryMyTeams, queryTeamsById} from './team';
import {prepareUsers} from './user';

import type {MyChannelsRequest} from '@actions/remote/channel';
import type {MyPreferencesRequest} from '@actions/remote/preference';
import type {MyTeamsRequest} from '@actions/remote/team';
import type {MyUserRequest} from '@actions/remote/user';
import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Model} from '@nozbe/watermelondb';
import type ChannelModel from '@typings/database/models/servers/channel';

type PrepareModelsArgs = {
    operator: ServerDataOperator;
    initialTeamId?: string;
    teamData?: MyTeamsRequest;
    chData?: MyChannelsRequest;
    prefData?: MyPreferencesRequest;
    meData?: MyUserRequest;
    isCRTEnabled?: boolean;
}

type PrepareModelsForDeletionArgs = {
    serverUrl: string;
    operator: ServerDataOperator;
    initialTeamId?: string;
    teamData?: MyTeamsRequest;
    chData?: MyChannelsRequest;
}

const {
    CHANNEL_BOOKMARK,
    POST,
    POSTS_IN_CHANNEL,
    POSTS_IN_THREAD,
    THREAD,
    THREADS_IN_TEAM,
    THREAD_PARTICIPANT,
    TEAM_THREADS_SYNC,
    MY_CHANNEL,
} = MM_TABLES.SERVER;

export async function prepareEntryModelsForDeletion({serverUrl, operator, teamData, chData}: PrepareModelsForDeletionArgs): Promise<Array<Promise<Model[]>>> {
    const modelPromises: Array<Promise<Model[]>> = [];
    const {database} = operator;
    let teamIdsToDelete: Set<string>|undefined;

    if (teamData?.teams?.length && teamData.memberships?.length) {
        const myTeams = await queryMyTeams(database).fetch();
        const joinedTeams = new Set(teamData.memberships?.filter((m) => m.delete_at === 0).map((m) => m.team_id));
        const myTeamsToDelete = myTeams.filter((m) => !joinedTeams.has(m.id));
        teamIdsToDelete = new Set(myTeamsToDelete.map((m) => m.id));
        const removeTeams = await queryTeamsById(database, Array.from(teamIdsToDelete)).fetch();

        removeTeams.forEach((team) => {
            modelPromises.push(prepareDeleteTeam(serverUrl, team));
        });
    }

    if (chData?.channels?.length && chData.memberships?.length) {
        const {channels} = chData;
        const fetchedChannelIds = new Set(channels.map((c) => c.id));
        const channelsQuery = await queryAllChannels(database);
        const storedChannelsMap = channelsQuery.reduce<Record<string, ChannelModel>>((map, channel) => {
            map[channel.id] = channel;
            return map;
        }, {});

        const removeChannelIds: string[] = Object.keys(storedChannelsMap).filter((id) => !fetchedChannelIds.has(id) && !teamIdsToDelete?.has(storedChannelsMap[id]?.teamId));
        let removeChannels: ChannelModel[]|undefined;
        if (removeChannelIds?.length) {
            removeChannels = await queryChannelsById(database, removeChannelIds).fetch();
            removeChannels.forEach((c) => {
                modelPromises.push(prepareDeleteChannel(serverUrl, c));
            });
        }
    }

    return modelPromises;
}

export async function prepareEntryModels({operator, teamData, chData, prefData, meData, isCRTEnabled}: PrepareModelsArgs): Promise<Array<Promise<Model[]>>> {
    const modelPromises: Array<Promise<Model[]>> = [];

    if (teamData?.teams?.length && teamData.memberships?.length) {
        modelPromises.push(...prepareMyTeams(operator, teamData.teams, teamData.memberships));
    }

    if (chData?.categories?.length) {
        modelPromises.push(prepareCategoriesAndCategoriesChannels(operator, chData.categories, true));
    }

    if (chData?.channels?.length && chData.memberships?.length) {
        const {channels, memberships} = chData;
        modelPromises.push(...await prepareAllMyChannels(operator, channels, memberships, isCRTEnabled));
    }

    if (prefData?.preferences?.length) {
        modelPromises.push(prepareMyPreferences(operator, prefData.preferences, true));
    }

    if (meData?.user) {
        modelPromises.push(prepareUsers(operator, [meData.user]));
    }

    return modelPromises;
}

export async function truncateCrtRelatedTables(serverUrl: string): Promise<{error: any}> {
    const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

    try {
        await database.write(() => {
            // @ts-ignore
            return database.adapter.unsafeExecute({
                sqls: [
                    [`DELETE FROM ${POST}`, []],
                    [`DELETE FROM ${POSTS_IN_CHANNEL}`, []],
                    [`DELETE FROM ${POSTS_IN_THREAD}`, []],
                    [`DELETE FROM ${THREAD}`, []],
                    [`DELETE FROM ${THREADS_IN_TEAM}`, []],
                    [`DELETE FROM ${THREAD_PARTICIPANT}`, []],
                    [`DELETE FROM ${TEAM_THREADS_SYNC}`, []],
                    [`DELETE FROM ${MY_CHANNEL}`, []],
                    [`DELETE FROM ${CHANNEL_BOOKMARK}`, []],
                ],
            });
        });
        await resetLastFullSync(operator);
    } catch (error) {
        if (__DEV__) {
            throw error;
        }
        return {error};
    }

    return {error: false};
}

/**
 * Processes entry models for teams, channels, preferences, and user data.
 * Prepares all the models and batches them to the database in a single operation.
 *
 * @param {PrepareModelsArgs} args - The arguments object
 * @param {ServerDataOperator} args.operator - Database operator for the server
 * @param {MyTeamsRequest} [args.teamData] - Team data including teams and memberships
 * @param {MyChannelsRequest} [args.chData] - Channel data including channels and memberships
 * @param {MyPreferencesRequest} [args.prefData] - User preferences data
 * @param {MyUserRequest} [args.meData] - Current user data
 * @param {boolean} [args.isCRTEnabled] - Whether Collapsed Reply Threads are enabled
 * @returns {Promise<Model[]>} Promise that resolves to an array of processed database models
 */
export async function processEntryModels({
    operator,
    teamData,
    chData,
    prefData,
    meData,
    isCRTEnabled,
}: PrepareModelsArgs): Promise<Model[]> {
    const modelPromises = await prepareEntryModels({operator, teamData, chData, prefData, meData, isCRTEnabled});

    const flattenModels = (await Promise.all(modelPromises)).flat();
    if (flattenModels.length) {
        operator.batchRecords(flattenModels, 'processEntryModels');
    }

    return flattenModels;
}

/**
 * Processes entry models for deletion operations.
 * Prepares models that need to be deleted (teams, channels) and batches the deletion operations.
 *
 * @param {PrepareModelsForDeletionArgs} args - The arguments object
 * @param {string} args.serverUrl - The server URL for the database operation
 * @param {ServerDataOperator} args.operator - Database operator for the server
 * @param {MyTeamsRequest} [args.teamData] - Team data to determine what teams to keep/delete
 * @param {MyChannelsRequest} [args.chData] - Channel data to determine what channels to keep/delete
 * @returns {Promise<void>} Promise that resolves when deletion operations are complete
 */
export async function processEntryModelsForDeletion({
    serverUrl,
    operator,
    teamData,
    chData,
}: PrepareModelsForDeletionArgs): Promise<void> {
    const modelsToDeletePromises = await prepareEntryModelsForDeletion({serverUrl, operator, teamData, chData});

    const modelsToDelete = (await Promise.all(modelsToDeletePromises)).flat();
    if (modelsToDelete.length) {
        operator.batchRecords(modelsToDelete, 'processEntryModelsForDeletion');
    }
}
