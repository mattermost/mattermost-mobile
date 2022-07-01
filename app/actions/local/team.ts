// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';

import DatabaseManager from '@database/manager';
import {prepareDeleteTeam, getMyTeamById, removeTeamFromTeamHistory, getTeamSearchHistoryByTerm, getTeamSearchHistoryById, getTeamSearchHistoryByTeamId, queryTeamSearchHistoryByTeamId} from '@queries/servers/team';
import {logError} from '@utils/log';

export async function removeUserFromTeam(serverUrl: string, teamId: string) {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const myTeam = await getMyTeamById(database, teamId);
        if (myTeam) {
            const team = await myTeam.team.fetch();
            if (!team) {
                throw new Error('Team not found');
            }
            const models = await prepareDeleteTeam(team);
            const system = await removeTeamFromTeamHistory(operator, team.id, true);
            if (system) {
                models.push(...system);
            }
            if (models.length) {
                await operator.batchRecords(models);
            }
        }

        return {error: undefined};
    } catch (error) {
        logError('Failed removeUserFromTeam', error);
        return {error};
    }
}

export async function addRecentTeamSearch(serverUrl: string, teamId: string, terms: string) {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const myTeam = await getMyTeamById(database, teamId);
        if (!myTeam) {
            return [];
        }

        const teamSearch = await getTeamSearchHistoryByTerm(database, teamId, terms);
        if (teamSearch!.length) {
            //delete before adding it back with new createAt time
            const preparedModels: Model[] = [teamSearch![0].prepareDestroyPermanently()];
            await operator.batchRecords(preparedModels);
        }

        const newSearch: TeamSearchHistory = {
            created_at: Date.now(),
            display_term: 'displayterm2',
            term: terms,
            team_id: teamId,
        };

        // this works
        const newSearchModel = await operator.handleTeamSearchHistory({teamSearchHistories: [newSearch], prepareRecordsOnly: false});

        return {error: undefined};
    } catch (error) {
        // eslint-disable-next-line no-console
        console.log('Failed addRecentTeamSearch', error);
        return {error};
    }
}

export async function deleteRecentTeamSearchById(serverUrl: string, id: string) {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const teamSearch = await getTeamSearchHistoryById(database, id);
        if (!teamSearch) {
            return;
        }
        const preparedModels: Model[] = [teamSearch!.prepareDestroyPermanently()];
        await operator.batchRecords(preparedModels);
        return;
    } catch (error) {
        throw new Error('Failed deleteRecentTeamSearchById');
    }
}

