// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';

import DatabaseManager from '@database/manager';
import NetworkManager from '@init/network_manager';
import {queryWebSocketLastDisconnected} from '@queries/servers/system';
import {prepareMyTeams} from '@queries/servers/team';

import {fetchMyChannelsForTeam} from './channel';
import {fetchPostsForUnreadChannels} from './post';
import {forceLogoutIfNecessary} from './session';

export type MyTeamsRequest = {
    teams?: Team[];
    memberships?: TeamMembership[];
    unreads?: TeamUnread[];
    error?: never;
}

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
