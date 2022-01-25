// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {prepareDeleteTeam, queryMyTeamById, removeTeamFromTeamHistory} from '@queries/servers/team';

import type TeamModel from '@typings/database/models/servers/team';

export const removeUserFromTeam = async (serverUrl: string, teamId: string) => {
    const serverDatabase = DatabaseManager.serverDatabases[serverUrl];
    if (!serverDatabase) {
        return;
    }

    const {operator, database} = serverDatabase;

    const myTeam = await queryMyTeamById(database, teamId);
    if (myTeam) {
        const team = await myTeam.team.fetch() as TeamModel;
        const models = await prepareDeleteTeam(team);
        const system = await removeTeamFromTeamHistory(operator, team.id, true);
        if (system) {
            models.push(...system);
        }
        if (models.length) {
            try {
                await operator.batchRecords(models);
            } catch {
                // eslint-disable-next-line no-console
                console.log('FAILED TO BATCH CHANGES FOR REMOVE USER FROM TEAM');
            }
        }
    }
};
