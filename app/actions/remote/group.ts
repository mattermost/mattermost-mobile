// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
export {};

// groups: MM-41882 import {Model} from '@nozbe/watermelondb';
// groups: MM-41882
// groups: MM-41882 import DatabaseManager from '@database/manager';
// groups: MM-41882 import NetworkManager from '@init/network_manager';
// groups: MM-41882 import {queryCommonSystemValues} from '@queries/servers/system';
// groups: MM-41882 import {queryTeamById} from '@queries/servers/team';
// groups: MM-41882
// groups: MM-41882 import {forceLogoutIfNecessary} from './session';
// groups: MM-41882
// groups: MM-41882 export const fetchGroupsForTeam = async (serverUrl: string, teamId: string, since: number) => {
// groups: MM-41882     const database = DatabaseManager.serverDatabases[serverUrl]?.database;
// groups: MM-41882     if (!database) {
// groups: MM-41882         return {error: `${serverUrl} database not found`};
// groups: MM-41882     }
// groups: MM-41882
// groups: MM-41882     let client;
// groups: MM-41882     try {
// groups: MM-41882         client = NetworkManager.getClient(serverUrl);
// groups: MM-41882     } catch (error) {
// groups: MM-41882         return {error};
// groups: MM-41882     }
// groups: MM-41882
// groups: MM-41882     try {
// groups: MM-41882         const system = await queryCommonSystemValues(database);
// groups: MM-41882         const team = await queryTeamById(database, teamId);
// groups: MM-41882         const hasLicense = system.license.IsLicensed === 'true' && system.license.LDAPGroups === 'true';
// groups: MM-41882
// groups: MM-41882         if (hasLicense && team) {
// groups: MM-41882             const groups: Group[] = [];
// groups: MM-41882             const groupsChannels: GroupChannelRelation[] = [];
// groups: MM-41882             const groupsTeams: GroupTeamRelation[] = [];
// groups: MM-41882             const groupMemberships: GroupMembership[] = [];
// groups: MM-41882             if (team.isGroupConstrained) {
// groups: MM-41882                 const [groupsAssociatedToChannelsInTeam, groupsAssociatedToTeam]: [{groups: Record<string, Group[]>}, {groups: Group[]; total_group_count: number}] = await Promise.all([
// groups: MM-41882                     client.getAllGroupsAssociatedToChannelsInTeam(teamId, true),
// groups: MM-41882                     client.getAllGroupsAssociatedToTeam(teamId, true),
// groups: MM-41882                 ]);
// groups: MM-41882
// groups: MM-41882                 if (groupsAssociatedToChannelsInTeam.groups) {
// groups: MM-41882                     const keys = Object.keys(groupsAssociatedToChannelsInTeam.groups);
// groups: MM-41882                     for (const key of keys) {
// groups: MM-41882                         for (const group of groupsAssociatedToChannelsInTeam.groups[key]) {
// groups: MM-41882                             groups.push(group);
// groups: MM-41882                             groupsChannels.push({
// groups: MM-41882                                 channel_id: key,
// groups: MM-41882                                 group_id: group.id,
// groups: MM-41882                             });
// groups: MM-41882                         }
// groups: MM-41882                     }
// groups: MM-41882                 }
// groups: MM-41882
// groups: MM-41882                 if (groupsAssociatedToTeam.groups) {
// groups: MM-41882                     for (const group of groupsAssociatedToTeam.groups) {
// groups: MM-41882                         groups.push(group);
// groups: MM-41882                         groupsTeams.push({group_id: group.id, team_id: teamId});
// groups: MM-41882                     }
// groups: MM-41882                 }
// groups: MM-41882             } else {
// groups: MM-41882                 const [groupsAssociatedToChannelsInTeam, allGroups]: [{groups: Record<string, Group[]>}, Group[]] = await Promise.all([
// groups: MM-41882                     client.getAllGroupsAssociatedToChannelsInTeam(teamId, true),
// groups: MM-41882                     client.getGroups(true, 0, 0, since),
// groups: MM-41882                 ]);
// groups: MM-41882
// groups: MM-41882                 if (groupsAssociatedToChannelsInTeam.groups) {
// groups: MM-41882                     const keys = Object.keys(groupsAssociatedToChannelsInTeam.groups);
// groups: MM-41882                     for (const key of keys) {
// groups: MM-41882                         for (const group of groupsAssociatedToChannelsInTeam.groups[key]) {
// groups: MM-41882                             groups.push(group);
// groups: MM-41882                             groupsChannels.push({
// groups: MM-41882                                 channel_id: key,
// groups: MM-41882                                 group_id: group.id,
// groups: MM-41882                             });
// groups: MM-41882                         }
// groups: MM-41882                     }
// groups: MM-41882                 }
// groups: MM-41882
// groups: MM-41882                 if (allGroups?.length) {
// groups: MM-41882                     groups.push(...allGroups);
// groups: MM-41882                 }
// groups: MM-41882             }
// groups: MM-41882
// groups: MM-41882             const userGroups = await client.getGroupsByUserId(system.currentUserId);
// groups: MM-41882             if (userGroups) {
// groups: MM-41882                 for (const mg of userGroups) {
// groups: MM-41882                     groupMemberships.push({group_id: mg.id, user_id: system.currentUserId});
// groups: MM-41882                     groups.push(mg);
// groups: MM-41882                 }
// groups: MM-41882             }
// groups: MM-41882
// groups: MM-41882             const models: Model[] = [];
// groups: MM-41882             const {operator} = DatabaseManager.serverDatabases[serverUrl];
// groups: MM-41882             if (groups.length) {
// groups: MM-41882                 const gModels = await operator.handleGroup({groups, prepareRecordsOnly: true});
// groups: MM-41882                 if (gModels.length) {
// groups: MM-41882                     models.push(...gModels);
// groups: MM-41882                 }
// groups: MM-41882             }
// groups: MM-41882
// groups: MM-41882             if (groupsChannels.length) {
// groups: MM-41882                 const gcModels = await operator.handleGroupsChannel({groupsChannels, prepareRecordsOnly: true});
// groups: MM-41882                 if (gcModels.length) {
// groups: MM-41882                     models.push(...gcModels);
// groups: MM-41882                 }
// groups: MM-41882             }
// groups: MM-41882
// groups: MM-41882             if (groupsTeams.length) {
// groups: MM-41882                 const gtModels = await operator.handleGroupsTeam({groupsTeams, prepareRecordsOnly: true});
// groups: MM-41882                 if (gtModels.length) {
// groups: MM-41882                     models.push(...gtModels);
// groups: MM-41882                 }
// groups: MM-41882             }
// groups: MM-41882
// groups: MM-41882             if (groupMemberships.length) {
// groups: MM-41882                 const gmModels = await operator.handleGroupMembership({groupMemberships, prepareRecordsOnly: true});
// groups: MM-41882                 if (gmModels.length) {
// groups: MM-41882                     models.push(...gmModels);
// groups: MM-41882                 }
// groups: MM-41882             }
// groups: MM-41882
// groups: MM-41882             if (models.length) {
// groups: MM-41882                 await operator.batchRecords(models.flat());
// groups: MM-41882             }
// groups: MM-41882         }
// groups: MM-41882         return null;
// groups: MM-41882     } catch (error) {
// groups: MM-41882         forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
// groups: MM-41882         return {error};
// groups: MM-41882     }
// groups: MM-41882 };
