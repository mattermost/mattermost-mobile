// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';
import {DeviceEventEmitter} from 'react-native';

import {removeUserFromTeam} from '@actions/local/team';
import {fetchRolesIfNeeded} from '@actions/remote/role';
import {fetchAllTeams, handleTeamChange, fetchMyTeam} from '@actions/remote/team';
import {updateUsersNoLongerVisible} from '@actions/remote/user';
import Events from '@constants/events';
import DatabaseManager from '@database/manager';
import {queryActiveServer} from '@queries/app/servers';
import {queryCurrentTeamId} from '@queries/servers/system';
import {queryLastTeam, prepareMyTeams} from '@queries/servers/team';
import {queryCurrentUser} from '@queries/servers/user';
import {dismissAllModals, popToRoot} from '@screens/navigation';

export async function handleLeaveTeamEvent(serverUrl: string, msg: WebSocketMessage) {
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }

    const currentTeamId = await queryCurrentTeamId(database.database);
    const user = await queryCurrentUser(database.database);
    if (!user) {
        return;
    }

    const {user_id: userId, team_id: teamId} = msg.data;
    if (user.id === userId) {
        await removeUserFromTeam(serverUrl, teamId);
        fetchAllTeams(serverUrl);

        if (user.isGuest) {
            updateUsersNoLongerVisible(serverUrl);
        }

        if (currentTeamId === teamId) {
            const currentServer = await queryActiveServer(DatabaseManager.appDatabase!.database);

            if (currentServer?.url === serverUrl) {
                DeviceEventEmitter.emit(Events.LEAVE_TEAM);
                await dismissAllModals();
                await popToRoot();
            }

            const teamToJumpTo = await queryLastTeam(database.database);
            if (teamToJumpTo) {
                handleTeamChange(serverUrl, teamToJumpTo);
            } // TODO else jump to "join a team" screen
        }
    }
}

export async function handleUpdateTeamEvent(serverUrl: string, msg: WebSocketMessage) {
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }

    try {
        const team = JSON.parse(msg.data.team) as Team;
        database.operator.handleTeam({
            teams: [team],
            prepareRecordsOnly: false,
        });
    } catch {
        // Do nothing
    }
}

// As of today, the server sends a duplicated event to add the user to the team.
// If we do not handle this, this ends up showing some errors in the database, apart
// of the extra computation time. We use this to track the events that are being handled
// and make sure we only handle one.
const addingTeam: {[id: string]: boolean} = {};

export async function handleUserAddedToTeamEvent(serverUrl: string, msg: WebSocketMessage) {
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }
    const {team_id: teamId} = msg.data;

    // Ignore duplicated team join events sent by the server
    if (addingTeam[teamId]) {
        return;
    }
    addingTeam[teamId] = true;

    const {teams, memberships: teamMemberships} = await fetchMyTeam(serverUrl, teamId, true);

    const modelPromises: Array<Promise<Model[]>> = [];
    if (teams?.length && teamMemberships?.length) {
        const myMember = teamMemberships[0];
        if (myMember.roles) {
            const rolesToLoad = new Set<string>();
            for (const role of myMember.roles.split(' ')) {
                rolesToLoad.add(role);
            }
            const serverRoles = await fetchRolesIfNeeded(serverUrl, Array.from(rolesToLoad), true);
            if (serverRoles.roles!.length) {
                const preparedRoleModels = database.operator.handleRole({
                    roles: serverRoles.roles!,
                    prepareRecordsOnly: true,
                });
                modelPromises.push(preparedRoleModels);
            }
        }
    }

    if (teams && teamMemberships) {
        const preparedTeamModels = prepareMyTeams(database.operator, teams, teamMemberships);
        if (preparedTeamModels) {
            modelPromises.push(...preparedTeamModels);
        }
    }

    if (modelPromises.length) {
        const models = await Promise.all(modelPromises);
        await database.operator.batchRecords(models.flat());
    }

    delete addingTeam[teamId];
}
