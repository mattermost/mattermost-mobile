// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';

import DatabaseManager from '@database/manager';
import NetworkManager from '@init/network_manager';
import {queryWebSocketLastDisconnected} from '@queries/servers/system';
import {prepareMyTeams, queryMyTeamById} from '@queries/servers/team';

import {fetchMyChannelsForTeam} from './channel';
import {fetchPostsForUnreadChannels} from './post';
import {fetchRolesIfNeeded} from './role';
import {forceLogoutIfNecessary} from './session';
import TeamModel from '@typings/database/models/servers/team';
import TeamMembershipModel from '@typings/database/models/servers/team_membership';

export type MyTeamsRequest = {
    teams?: Team[];
    memberships?: TeamMembership[];
    unreads?: TeamUnread[];
    error?: never;
}

export const addUserToTeam = async (serverUrl: string, teamId: string, userId: string, fetchOnly = false) => {
    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const member = await client.addToTeam(teamId, userId);
        const unreads = await client.getTeamUnreads(teamId);

        if (!fetchOnly) {
            fetchRolesIfNeeded(serverUrl, member.roles.split(' '));
            const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
            if (operator) {
                const myTeams: MyTeam[] = [{
                    id: member.team_id,
                    roles: member.roles,
                    is_unread: unreads.msg_count > 0,
                    mentions_count: unreads.mention_count,
                }];

                const models = await Promise.all([
                    operator.handleMyTeam({myTeams, prepareRecordsOnly: true}),
                    operator.handleTeamMemberships({teamMemberships: [member], prepareRecordsOnly: true}),
                ]);

                if (models.length) {
                    const flattenedModels = models.flat() as Model[];
                    if (flattenedModels?.length > 0) {
                        await operator.batchRecords(flattenedModels);
                    }
                }
            }
        }

        return {member, unreads};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const fetchMyTeams = async (serverUrl: string, fetchOnly = false): Promise<MyTeamsRequest> => {
    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const [teams, memberships, unreads] = await Promise.all<Team[], TeamMembership[], TeamUnread[]>([
            client.getMyTeams(),
            client.getMyTeamMembers(),
            client.getMyTeamUnreads(),
        ]);

        if (!fetchOnly) {
            const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
            const modelPromises: Array<Promise<Model[]>> = [];
            if (operator) {
                const prepare = prepareMyTeams(operator, teams, memberships, unreads);
                if (prepare) {
                    modelPromises.push(...prepare);
                }
                if (modelPromises.length) {
                    const models = await Promise.all(modelPromises);
                    const flattenedModels = models.flat() as Model[];
                    if (flattenedModels?.length > 0) {
                        await operator.batchRecords(flattenedModels);
                    }
                }
            }
        }

        return {teams, memberships, unreads};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const fetchTeamsChannelsAndUnreadPosts = async (serverUrl: string, teams: Team[], memberships: TeamMembership[], excludeTeamId?: string) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    const myTeams = teams.filter((t) => memberships.find((m) => m.team_id === t.id && t.id !== excludeTeamId));
    const since = await queryWebSocketLastDisconnected(database);

    for await (const team of myTeams) {
        const {channels, memberships: members} = await fetchMyChannelsForTeam(serverUrl, team.id, since > 0, since, false, true);

        if (channels?.length && members?.length) {
            fetchPostsForUnreadChannels(serverUrl, channels, members);
        }
    }

    return {error: undefined};
};

export const fetchTeamByName = async (serverUrl: string, teamName: string, fetchOnly = false) => {
    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const team = await client.getTeamByName(teamName);

        if (!fetchOnly) {
            const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
            if (operator) {
                const model = await operator.handleTeam({teams: [team], prepareRecordsOnly: true});
                if (model) {
                    await operator.batchRecords(model);
                }
            }
        }

        return {team};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const removeUserFromTeam = async (serverUrl: string, teamId: string, userId: string, fetchOnly = false) => {
    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        await client.removeFromTeam(teamId, userId);

        if (!fetchOnly && DatabaseManager.serverDatabases[serverUrl]) {
            const {operator, database} = DatabaseManager.serverDatabases[serverUrl];
            const myTeam = await queryMyTeamById(database, teamId);
            const models: Model[] = [];
            if (myTeam) {
                const team = await myTeam.team.fetch() as TeamModel;
                const members: TeamMembershipModel[] = await team.members.fetch();
                const member = members.find((m) => m.userId === userId);

                myTeam.prepareDestroyPermanently();
                models.push(myTeam);
                if (member) {
                    member.prepareDestroyPermanently();
                    models.push(member);
                }

                if (models.length) {
                    await operator.batchRecords(models);
                }
            }
        }

        return {error: undefined};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};
