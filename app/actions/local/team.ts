// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';

import {prepareDeleteTeam, queryMyTeamById} from '@app/queries/servers/team';
import DatabaseManager from '@database/manager';

import type TeamModel from '@typings/database/models/servers/team';

export const localRemoveUserFromTeam = async (serverUrl: string, teamId: string) => {
    const serverDatabase = DatabaseManager.serverDatabases[serverUrl];
    if (!serverDatabase) {
        return;
    }

    const {operator, database} = serverDatabase;

    const myTeam = await queryMyTeamById(database, teamId);
    const models: Model[] = [];
    if (myTeam) {
        const team = await myTeam.team.fetch() as TeamModel;
        prepareDeleteTeam(team);
        models.push(myTeam);

        if (models.length) {
            await operator.batchRecords(models);
        }
    }
};
