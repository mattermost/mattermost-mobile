// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';

import DatabaseManager from '@database/manager';
import NetworkManager from '@init/network_manager';
import {queryCommonSystemValues, queryWebSocketLastDisconnected} from '@queries/servers/system';
import {queryTeamById} from '@queries/servers/team';

import {forceLogoutIfNecessary} from './session';

export const fetchGroupsForTeam = async (serverUrl: string, teamId: string) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const system = await queryCommonSystemValues(database);
        const team = await queryTeamById(database, teamId);
        const hasLicense = system.license.IsLicensed === 'true' && system.license.LDAPGroups === 'true';

        if (hasLicense && team) {
            const groups: Group[] = [];
            const groupsChannels: GroupChannelRelation[] = [];
            const groupsTeams: GroupTeamRelation[] = [];
            const groupMemberships: GroupMembership[] = [];
            if (team.isGroupConstrained) {
                const [groupsAssociatedToChannelsInTeam, groupsAssociatedToTeam]: [{groups: Record<string, Group[]>}, {groups: Group[]; total_group_count: number}] = await Promise.all([
                    client.getAllGroupsAssociatedToChannelsInTeam(teamId, true),
                    client.getAllGroupsAssociatedToTeam(teamId, true),
                ]);

                if (groupsAssociatedToChannelsInTeam.groups) {
                    const keys = Object.keys(groupsAssociatedToChannelsInTeam.groups);
                    for (const key of keys) {
                        for (const group of groupsAssociatedToChannelsInTeam.groups[key]) {
                            groups.push(group);
                            groupsChannels.push({
                                channel_id: key,
                                group_id: group.id,
                            });
                        }
                    }
                }

                if (groupsAssociatedToTeam.groups) {
                    for (const group of groupsAssociatedToTeam.groups) {
                        groups.push(group);
                        groupsTeams.push({group_id: group.id, team_id: teamId});
                    }
                }
            } else {
                const since = await queryWebSocketLastDisconnected(database);
                const [groupsAssociatedToChannelsInTeam, allGroups]: [{groups: Record<string, Group[]>}, Group[]] = await Promise.all([
                    client.getAllGroupsAssociatedToChannelsInTeam(teamId, true),
                    client.getGroups(true, 0, 0, since),
                ]);

                if (groupsAssociatedToChannelsInTeam.groups) {
                    const keys = Object.keys(groupsAssociatedToChannelsInTeam.groups);
                    for (const key of keys) {
                        for (const group of groupsAssociatedToChannelsInTeam.groups[key]) {
                            groups.push(group);
                            groupsChannels.push({
                                channel_id: key,
                                group_id: group.id,
                            });
                        }
                    }
                }

                if (allGroups?.length) {
                    groups.push(...allGroups);
                }
            }

            const userGroups = await client.getGroupsByUserId(system.currentUserId);
            if (userGroups) {
                for (const mg of userGroups) {
                    groupMemberships.push({group_id: mg.id, user_id: system.currentUserId});
                    groups.push(mg);
                }
            }

            const models: Model[] = [];
            const {operator} = DatabaseManager.serverDatabases[serverUrl];
            if (groups.length) {
                const gModels = await operator.handleGroup({groups, prepareRecordsOnly: true});
                if (gModels.length) {
                    models.push(...gModels);
                }
            }

            if (groupsChannels.length) {
                const gcModels = await operator.handleGroupsChannel({groupsChannels, prepareRecordsOnly: true});
                if (gcModels.length) {
                    models.push(...gcModels);
                }
            }

            if (groupsTeams.length) {
                const gtModels = await operator.handleGroupsTeam({groupsTeams, prepareRecordsOnly: true});
                if (gtModels.length) {
                    models.push(...gtModels);
                }
            }

            if (groupMemberships.length) {
                const gmModels = await operator.handleGroupMembership({groupMemberships, prepareRecordsOnly: true});
                if (gmModels.length) {
                    models.push(...gmModels);
                }
            }

            if (models.length) {
                await operator.batchRecords(models.flat());
            }
        }
        return null;
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};
