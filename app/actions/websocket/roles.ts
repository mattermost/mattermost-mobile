// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchRolesIfNeeded} from '@actions/remote/role';
import DatabaseManager from '@database/manager';
import {getRoleById} from '@queries/servers/role';
import {getCurrentUserId} from '@queries/servers/system';
import {getCurrentUser} from '@queries/servers/user';

import type {Model} from '@nozbe/watermelondb';

export async function handleRoleUpdatedEvent(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        // only update Role records that exist in the Role Table
        const role: Role = JSON.parse(msg.data.role);
        const dbRole = await getRoleById(database, role.id);
        if (!dbRole) {
            return;
        }

        operator.handleRole({
            roles: [role],
            prepareRecordsOnly: false,
        });
    } catch {
        // do nothing
    }
}

export async function handleUserRoleUpdatedEvent(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return;
    }
    const {database} = operator;

    const currentUserId = await getCurrentUserId(database);
    if (currentUserId !== msg.data.user_id) {
        return;
    }

    const models: Model[] = [];

    // update Role Table if needed
    const rolesArray = msg.data.roles.split(' ');
    const newRoles = await fetchRolesIfNeeded(serverUrl, rolesArray, true);
    if (newRoles?.roles?.length) {
        const preparedRoleModels = await operator.handleRole({
            roles: newRoles.roles!,
            prepareRecordsOnly: true,
        });

        models.push(...preparedRoleModels);
    }

    // update User Table record
    const user = await getCurrentUser(database);
    if (user) {
        user!.prepareUpdate((u) => {
            u.roles = msg.data.roles;
        });
        models.push(user);
    }

    await operator.batchRecords(models, 'handleUserRoleUpdatedEvent');
}

export async function handleTeamMemberRoleUpdatedEvent(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const member: TeamMembership = JSON.parse(msg.data.member);

        if (member.delete_at > 0) {
            return;
        }

        const currentUserId = await getCurrentUserId(database);
        if (currentUserId !== member.user_id) {
            return;
        }

        const models: Model[] = [];

        // update Role Table if needed
        const rolesArray = member.roles.split(' ');
        const newRoles = await fetchRolesIfNeeded(serverUrl, rolesArray, true);
        if (newRoles?.roles?.length) {
            const preparedRoleModels = await operator.handleRole({
                roles: newRoles.roles!,
                prepareRecordsOnly: true,
            });
            if (preparedRoleModels.length) {
                models.push(...preparedRoleModels);
            }
        }

        // update MyTeam Table
        const myTeams: MyTeam[] = [{id: member.team_id, roles: member.roles}];
        const myTeamRecords = await operator.handleMyTeam({
            prepareRecordsOnly: true,
            myTeams,
        });

        models.push(...myTeamRecords);

        // update TeamMembership table
        const teamMembership = await operator.handleTeamMemberships({
            teamMemberships: [member],
            prepareRecordsOnly: true,
        });
        models.push(...teamMembership);

        await operator.batchRecords(models, 'handleTeamMemberRoleUpdatedEvent');
    } catch {
        // do nothing
    }
}
