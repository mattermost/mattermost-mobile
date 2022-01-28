// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchRolesIfNeeded, RolesRequest} from '@actions/remote/role';
import {fetchMe} from '@actions/remote/user';
import {safeParseJSON} from '@app/utils/helpers';
import DatabaseManager from '@database/manager';
import {queryRoleById} from '@queries/servers/role';
import {queryCurrentUserId} from '@queries/servers/system';
import {prepareMyTeams} from '@queries/servers/team';
import {prepareUsers} from '@queries/servers/user';
import {WebSocketMessage} from '@typings/api/websocket';

import type {Model} from '@nozbe/watermelondb';
import type {ServerDatabase} from '@typings/database/database';
import type RoleModel from '@typings/database/models/servers/role';

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

    await database.database.write(async () => {
        await dbRole.update((roleRecord: RoleModel) => {
            roleRecord.permissions = role.permissions;
        });
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
    const newRoles = await fetchRolesIfNeeded(serverUrl, Array.from(msg.data.roles), true);
    const preparedRoleModels = getPreparedRoleModels(database, newRoles);
    modelPromises.push(preparedRoleModels);

    // update User Table record
    const meData = await fetchMe(serverUrl, true);
    const userModels = prepareUsers(database.operator, [meData.user!]);
    if (userModels) {
        modelPromises.push(userModels);
    }

    const models = await Promise.all(modelPromises);
    const flattenedModels = models.flat() as Model[];
    if (flattenedModels?.length > 0) {
        await database.operator.batchRecords(flattenedModels);
    }
}

export async function handleMemberRoleUpdatedEvent(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }

    const currentUserId = await queryCurrentUserId(database.database);

    const member = safeParseJSON(msg.data.member) as TeamMembership;
    if (currentUserId !== member.user_id) {
        return;
    }

    const modelPromises: Array<Promise<Model[]>> = [];

    // update Role Table if needed
    const newRoles = await fetchRolesIfNeeded(serverUrl, Array.from(member.roles), true);
    const preparedRoleModels = getPreparedRoleModels(database, newRoles);
    modelPromises.push(preparedRoleModels);

    // update MyTeam Table
    const preparedMyTeam = prepareMyTeams(database.operator, [], [member]);
    if (preparedMyTeam) {
        modelPromises.push(preparedMyTeam[2]);
    }

    const models = await Promise.all(modelPromises);
    const flattenedModels = models.flat() as Model[];
    if (flattenedModels?.length > 0) {
        await database.operator.batchRecords(flattenedModels);
    }
}

async function getPreparedRoleModels(database: ServerDatabase, roles: RolesRequest): Promise<Model[]> {
    if (!(typeof roles.roles === 'string' && roles.roles === 'null')) {
        const preparedRolesModels = await database.operator.handleRole({
            roles: roles.roles!,
            prepareRecordsOnly: true,
        });
        return preparedRolesModels;
    }
    return [];
}

