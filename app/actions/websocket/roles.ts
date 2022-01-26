// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchRolesIfNeeded} from '@actions/remote/role';
import {fetchMyTeam} from '@actions/remote/team';
import {fetchMe} from '@actions/remote/user';
import DatabaseManager from '@database/manager';
import {queryCurrentUserId} from '@queries/servers/system';
import {prepareMyTeams} from '@queries/servers/team';
import {prepareUsers} from '@queries/servers/user';
import {WebSocketMessage} from '@typings/api/websocket';

import type {Model} from '@nozbe/watermelondb';
export async function handleRoleUpdatedEvent(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }


    // database.operator.handleRole();
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

    const newRoles = await fetchRolesIfNeeded(serverUrl, Array.from(msg.data.roles), true);
    if (!(typeof newRoles.roles === 'string' && newRoles.roles === 'null')) {
        const preparedRolesModels = await database.operator.handleRole({
            roles: newRoles.roles!,
            prepareRecordsOnly: true,
        });
        modelPromises.push(preparedRolesModels);
    }

    const meData = await fetchMe(serverUrl, true);
    const userModels = prepareUsers(database.operator, [meData.user!]);
    modelPromises.push(userModels);

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
    const member = JSON.parse(msg.data.member);
    if (currentUserId !== member.user_id) {
        return;
    }

    const modelPromises: Array<Promise<Model[]>> = [];
    const newRoles = await fetchRolesIfNeeded(serverUrl, Array.from(member.roles), true);
    if (!(typeof newRoles.roles === 'string' && newRoles.roles === 'null')) {
        const preparedRolesModels = await database.operator.handleRole({
            roles: newRoles.roles!,
            prepareRecordsOnly: true,
        });
        modelPromises.push(preparedRolesModels);
    }

    const teamData = await fetchMyTeam(serverUrl, member.team_id, true);
    const prepare = prepareMyTeams(database.operator, teamData!.teams!, teamData!.memberships!);
    if (prepare) {
        modelPromises.push(...prepare);
    }

    const models = await Promise.all(modelPromises);
    const flattenedModels = models.flat() as Model[];
    if (flattenedModels?.length > 0) {
        await database.operator.batchRecords(flattenedModels);
    }
}
