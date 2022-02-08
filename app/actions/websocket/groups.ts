// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';

import type {HandleGroupArgs, HandleGroupsChannelArgs, HandleGroupsTeamArgs} from '@typings/database/database';

export async function handleGroupUpdatedEvent(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return;
    }

    try {
        const group = JSON.parse(msg.data.group);
        const groupArgs: HandleGroupArgs = {
            groups: [group],
            prepareRecordsOnly: false,
        };
        operator.handleGroup(groupArgs);
    } catch {
        // do nothing
    }
}

export async function handleGroupAssociatedToTeam(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return;
    }

    try {
        const groupsTeamArgs: HandleGroupsTeamArgs = {
            groupsTeams: [{
                group_id: msg.data.group_id,
                team_id: msg.broadcast.team_id,
            }],
            prepareRecordsOnly: false,
        };
        operator.handleGroupsTeam(groupsTeamArgs);
    } catch {
        // do nothing
    }
}

export async function handleGroupNotAssociatedToTeam(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return;
    }

    try {
        const group_id = msg.data.group_id;
        const team_id = msg.broadcast.team_id;
        const groupTeam = await database.get(MM_TABLES.SERVER.GROUPS_TEAM).query(
            Q.where('team_id', team_id),
            Q.where('group_id', group_id),
        ).fetch();

        if (groupTeam.length) {
            await database.write(async () => {
                await groupTeam[0].destroyPermanently();
            });
        }
    } catch {
        // do nothing
    }
}

export async function handleGroupAssociatedToChannel(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return;
    }

    try {
        const groupsChannelArgs: HandleGroupsChannelArgs = {
            groupsChannels: [{
                group_id: msg.data.group_id,
                channel_id: msg.broadcast.channel_id,
            }],
            prepareRecordsOnly: false,
        };
        operator.handleGroupsChannel(groupsChannelArgs);
    } catch {
        // do nothing
    }
}

export async function handleGroupNotAssociatedToChannel(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return;
    }

    try {
        const group_id = msg.data.group_id;
        const channel_id = msg.broadcast.channel_id;
        const groupChannel = await database.get(MM_TABLES.SERVER.GROUPS_CHANNEL).query(
            Q.where('channel_id', channel_id),
            Q.where('group_id', group_id),
        ).fetch();

        if (groupChannel.length) {
            await database.write(async () => {
                await groupChannel[0].destroyPermanently();
            });
        }
    } catch {
        // do nothing
    }
}

