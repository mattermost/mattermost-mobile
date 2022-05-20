// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {prepareDeleteTeam, getMyTeamById, removeTeamFromTeamHistory} from '@queries/servers/team';

export async function removeUserFromTeam(serverUrl: string, teamId: string) {
    const serverDatabase = DatabaseManager.serverDatabases[serverUrl];
    if (!serverDatabase) {
        return;
    }

    const {operator, database} = serverDatabase;

    const myTeam = await getMyTeamById(database, teamId);
    if (myTeam) {
        const team = await myTeam.team.fetch();
        if (!team) {
            return;
        }
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
}
