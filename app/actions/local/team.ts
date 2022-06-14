// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {prepareDeleteTeam, getMyTeamById, removeTeamFromTeamHistory} from '@queries/servers/team';

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
        // eslint-disable-next-line no-console
        console.log('Failed removeUserFromTeam', error);
        return {error};
    }
}
