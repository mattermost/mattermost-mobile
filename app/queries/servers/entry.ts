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
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
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
