// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
export {};

// groups: MM-41882 import {Q} from '@nozbe/watermelondb';
// groups: MM-41882
// groups: MM-41882 import {MM_TABLES} from '@constants/database';
// groups: MM-41882 import DatabaseManager from '@database/manager';
// groups: MM-41882
// groups: MM-41882 import type {HandleGroupArgs, HandleGroupsChannelArgs, HandleGroupsTeamArgs} from '@typings/database/database';
// groups: MM-41882
// groups: MM-41882 export async function handleGroupUpdatedEvent(serverUrl: string, msg: WebSocketMessage): Promise<void> {
// groups: MM-41882     const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
// groups: MM-41882     if (!operator) {
// groups: MM-41882         return;
// groups: MM-41882     }
// groups: MM-41882
// groups: MM-41882     try {
// groups: MM-41882         const group = JSON.parse(msg.data.group);
// groups: MM-41882         const groupArgs: HandleGroupArgs = {
// groups: MM-41882             groups: [group],
// groups: MM-41882             prepareRecordsOnly: false,
// groups: MM-41882         };
// groups: MM-41882         await operator.handleGroup(groupArgs);
// groups: MM-41882     } catch {
// groups: MM-41882         // do nothing
// groups: MM-41882     }
// groups: MM-41882 }
// groups: MM-41882
// groups: MM-41882 export async function handleGroupAssociatedToTeam(serverUrl: string, msg: WebSocketMessage): Promise<void> {
// groups: MM-41882     const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
// groups: MM-41882     if (!operator) {
// groups: MM-41882         return;
// groups: MM-41882     }
// groups: MM-41882
// groups: MM-41882     try {
// groups: MM-41882         const groupsTeamArgs: HandleGroupsTeamArgs = {
// groups: MM-41882             groupsTeams: [{
// groups: MM-41882                 group_id: msg.data.group_id,
// groups: MM-41882                 team_id: msg.broadcast.team_id,
// groups: MM-41882             }],
// groups: MM-41882             prepareRecordsOnly: false,
// groups: MM-41882         };
// groups: MM-41882         await operator.handleGroupsTeam(groupsTeamArgs);
// groups: MM-41882     } catch {
// groups: MM-41882         // do nothing
// groups: MM-41882     }
// groups: MM-41882 }
// groups: MM-41882
// groups: MM-41882 export async function handleGroupNotAssociatedToTeam(serverUrl: string, msg: WebSocketMessage): Promise<void> {
// groups: MM-41882     const database = DatabaseManager.serverDatabases[serverUrl]?.database;
// groups: MM-41882     if (!database) {
// groups: MM-41882         return;
// groups: MM-41882     }
// groups: MM-41882
// groups: MM-41882     try {
// groups: MM-41882         const groupTeam = await database.get(MM_TABLES.SERVER.GROUPS_TEAM).query(
// groups: MM-41882             Q.where('team_id', msg.broadcast.team_id),
// groups: MM-41882             Q.where('group_id', msg.data.group_id),
// groups: MM-41882         ).fetch();
// groups: MM-41882
// groups: MM-41882         if (groupTeam.length) {
// groups: MM-41882             await database.write(async () => {
// groups: MM-41882                 await groupTeam[0].destroyPermanently();
// groups: MM-41882             });
// groups: MM-41882         }
// groups: MM-41882     } catch {
// groups: MM-41882         // do nothing
// groups: MM-41882     }
// groups: MM-41882 }
// groups: MM-41882
// groups: MM-41882 export async function handleGroupAssociatedToChannel(serverUrl: string, msg: WebSocketMessage): Promise<void> {
// groups: MM-41882     const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
// groups: MM-41882     if (!operator) {
// groups: MM-41882         return;
// groups: MM-41882     }
// groups: MM-41882
// groups: MM-41882     try {
// groups: MM-41882         const groupsChannelArgs: HandleGroupsChannelArgs = {
// groups: MM-41882             groupsChannels: [{
// groups: MM-41882                 group_id: msg.data.group_id,
// groups: MM-41882                 channel_id: msg.broadcast.channel_id,
// groups: MM-41882             }],
// groups: MM-41882             prepareRecordsOnly: false,
// groups: MM-41882         };
// groups: MM-41882         await operator.handleGroupsChannel(groupsChannelArgs);
// groups: MM-41882     } catch {
// groups: MM-41882         // do nothing
// groups: MM-41882     }
// groups: MM-41882 }
// groups: MM-41882
// groups: MM-41882 export async function handleGroupNotAssociatedToChannel(serverUrl: string, msg: WebSocketMessage): Promise<void> {
// groups: MM-41882     const database = DatabaseManager.serverDatabases[serverUrl]?.database;
// groups: MM-41882     if (!database) {
// groups: MM-41882         return;
// groups: MM-41882     }
// groups: MM-41882
// groups: MM-41882     try {
// groups: MM-41882         const groupChannel = await database.get(MM_TABLES.SERVER.GROUPS_CHANNEL).query(
// groups: MM-41882             Q.where('channel_id', msg.broadcast.channel_id),
// groups: MM-41882             Q.where('group_id', msg.data.group_id),
// groups: MM-41882         ).fetch();
// groups: MM-41882
// groups: MM-41882         if (groupChannel.length) {
// groups: MM-41882             await database.write(async () => {
// groups: MM-41882                 await groupChannel[0].destroyPermanently();
// groups: MM-41882             });
// groups: MM-41882         }
// groups: MM-41882     } catch {
// groups: MM-41882         // do nothing
// groups: MM-41882     }
// groups: MM-41882 }
