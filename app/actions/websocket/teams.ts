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

    if (user.id === msg.data.user_id) {
        await removeUserFromTeam(serverUrl, msg.data.team_id);
        fetchAllTeams(serverUrl);

        if (user.isGuest) {
            updateUsersNoLongerVisible(serverUrl);
        }

        if (currentTeamId === msg.data.team_id) {
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

export async function handleUserAddedToTeamEvent(serverUrl: string, msg: WebSocketMessage) {
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }

    const {teams, memberships: teamMemberships} = await fetchMyTeam(serverUrl, msg.data.team_id, true);

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
}
