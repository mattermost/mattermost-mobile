// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchRolesIfNeeded} from '@actions/remote/role';
import DatabaseManager from '@database/manager';
import {queryRoleById} from '@queries/servers/role';
import {queryCurrentUserId} from '@queries/servers/system';
import {queryCurrentUser} from '@queries/servers/user';
import {safeParseJSON} from '@utils/helpers';

import type {Model} from '@nozbe/watermelondb';

export async function handleRoleUpdatedEvent(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }

    // only update Role records that exist in the Role Table
    const role = safeParseJSON(msg.data.role) as Role;
    const dbRole = await queryRoleById(database.database, role.id);
    if (!dbRole) {
        return;
    }

    database.operator.handleRole({
        roles: [role],
        prepareRecordsOnly: false,
    });
}

export async function handleUserRoleUpdatedEvent(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }

    const currentUserId = await queryCurrentUserId(database.database);
    if (currentUserId !== msg.data.user_id) {
        return;
    }

    const modelPromises: Array<Promise<Model[]>> = [];

    // update Role Table if needed
    const rolesArray = msg.data.roles.split(' ');
    const newRoles = await fetchRolesIfNeeded(serverUrl, rolesArray, true);
    if (newRoles?.roles?.length) {
        const preparedRoleModels = database.operator.handleRole({
            roles: newRoles.roles!,
            prepareRecordsOnly: true,
        });
        modelPromises.push(preparedRoleModels);
    }

    // update User Table record
    const user = await queryCurrentUser(database.database);
    if (user) {
        user!.prepareUpdate((u) => {
            u.roles = msg.data.roles;
        });
        modelPromises.push(Promise.resolve([user]));
    }

    const models = await Promise.all(modelPromises);
    const flattenedModels = models.flat() as Model[];
    if (flattenedModels?.length > 0) {
        await database.operator.batchRecords(flattenedModels);
    }
}

export async function handleTeamMemberRoleUpdatedEvent(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return;
    }

    try {
        const member = JSON.parse(msg.data.member);

        const currentUserId = await queryCurrentUserId(operator.database);
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
            models.push(...preparedRoleModels);
        }

        // update MyTeam Table
        const myTeams: MyTeam[] = [{id: member.team_id, roles: member.roles}];
        const myTeamRecords = await operator.handleMyTeam({
            prepareRecordsOnly: true,
            myTeams,
        });

        if (myTeamRecords.length) {
            models.push(...myTeamRecords);
        }

        if (models?.length) {
            await operator.batchRecords(models);
        }
    } catch {
        // do nothing
    }
}
