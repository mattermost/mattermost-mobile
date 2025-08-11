// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {prepareDeleteTeam, getMyTeamById, queryTeamSearchHistoryByTeamId, removeTeamFromTeamHistory, getTeamSearchHistoryById, getTeamById} from '@queries/servers/team';
import {logError} from '@utils/log';

import type Model from '@nozbe/watermelondb/Model';

export const MAX_TEAM_SEARCHES = 15;

export async function removeUserFromTeam(serverUrl: string, teamId: string) {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const myTeam = await getMyTeamById(database, teamId);
        if (myTeam) {
            const team = await getTeamById(database, myTeam.id);
            if (!team) {
                throw new Error('Team not found');
            }
            const models = await prepareDeleteTeam(serverUrl, team);
            const system = await removeTeamFromTeamHistory(operator, team.id, true);
            if (system) {
                models.push(...system);
            }
            if (models.length) {
                await operator.batchRecords(models, 'removeUserFromTeam');
            }
        }

        return {error: undefined};
    } catch (error) {
        logError('Failed removeUserFromTeam', error);
        return {error};
    }
}

export async function addSearchToTeamSearchHistory(serverUrl: string, teamId: string, terms: string) {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const newSearch: TeamSearchHistory = {
            created_at: Date.now(),
            display_term: terms,
            term: terms,
            team_id: teamId,
        };

        const models: Model[] = [];
        const searchModels = await operator.handleTeamSearchHistory({teamSearchHistories: [newSearch], prepareRecordsOnly: true});
        const searchModel = searchModels[0];

        models.push(searchModel);

        // determine if need to delete the oldest entry
        if (searchModel._raw._changed !== 'created_at') {
            const teamSearchHistory = await queryTeamSearchHistoryByTeamId(database, teamId).fetch();
            if (teamSearchHistory.length > MAX_TEAM_SEARCHES) {
                const lastSearches = teamSearchHistory.slice(MAX_TEAM_SEARCHES);
                for (const lastSearch of lastSearches) {
                    models.push(lastSearch.prepareDestroyPermanently());
                }
            }
        }

        await operator.batchRecords(models, 'addSearchToTeamHistory');
        return {searchModel};
    } catch (error) {
        logError('Failed addSearchToTeamSearchHistory', error);
        return {error};
    }
}

export async function removeSearchFromTeamSearchHistory(serverUrl: string, id: string) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const teamSearch = await getTeamSearchHistoryById(database, id);
        if (teamSearch) {
            await database.write(async () => {
                await teamSearch.destroyPermanently();
            });
        }
        return {teamSearch};
    } catch (error) {
        logError('Failed removeSearchFromTeamSearchHistory', error);
        return {error};
    }
}

