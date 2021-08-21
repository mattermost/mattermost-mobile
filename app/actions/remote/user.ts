// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {fetchRolesIfNeeded} from '@actions/remote/role';
import {Database, General} from '@constants';
import DatabaseManager from '@database/manager';
import {debounce} from '@helpers/api/general';
import analytics from '@init/analytics';
import NetworkManager from '@init/network_manager';
import {prepareUsers, queryCurrentUser, queryUsersById, queryUsersByUsername} from '@queries/servers/user';
import {queryCurrentUserId} from '@queries/servers/system';

import type {Client} from '@client/rest';
import type {LoadMeArgs} from '@typings/database/database';
import type RoleModel from '@typings/database/models/servers/role';
import type UserModel from '@typings/database/models/servers/user';

import {forceLogoutIfNecessary} from './session';

export type ProfilesPerChannelRequest = {
    data?: ProfilesInChannelRequest[];
    error?: never;
}

export type ProfilesInChannelRequest = {
    users?: UserProfile[];
    channelId: string;
    error?: never;
}

export const fetchProfilesInChannel = async (serverUrl: string, channelId: string, excludeUserId?: string, fetchOnly = false): Promise<ProfilesInChannelRequest> => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {channelId, error};
    }

    try {
        const users = await client.getProfilesInChannel(channelId);
        const uniqueUsers = Array.from(new Set(users));
        if (!fetchOnly) {
            const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
            if (operator) {
                const prepare = prepareUsers(operator, uniqueUsers.filter((u) => u.id !== excludeUserId));
                if (prepare) {
                    const models = await prepare;
                    if (models.length) {
                        await operator.batchRecords(models);
                    }
                }
            }
        }

        return {channelId, users: uniqueUsers};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error);
        return {channelId, error};
    }
};

export const fetchProfilesPerChannels = async (serverUrl: string, channelIds: string[], excludeUserId?: string, fetchOnly = false): Promise<ProfilesPerChannelRequest> => {
    try {
        const requests = channelIds.map((id) => fetchProfilesInChannel(serverUrl, id, excludeUserId, true));
        const data = await Promise.all(requests);

        if (!fetchOnly) {
            const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
            if (operator) {
                const users = new Set<UserProfile>();
                for (const item of data) {
                    if (item.users?.length) {
                        item.users.forEach(users.add, users);
                    }
                }
                const prepare = prepareUsers(operator, Array.from(users).filter((u) => u.id !== excludeUserId));
                if (prepare) {
                    const models = await prepare;
                    if (models.length) {
                        await operator.batchRecords(models);
                    }
                }
            }
        }

        return {data};
    } catch (error) {
        return {error};
    }
};

export const loadMe = async (serverUrl: string, {deviceToken, user}: LoadMeArgs) => {
    let currentUser = user;

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
        if (deviceToken) {
            await client.attachDevice(deviceToken);
        }

        if (!currentUser) {
            currentUser = await client.getMe();
        }
    } catch (e) {
        await forceLogoutIfNecessary(serverUrl, e);
        return {
            error: e,
            currentUser: undefined,
        };
    }

    try {
        const analyticsClient = analytics.create(serverUrl);
        analyticsClient.setUserId(currentUser.id);
        analyticsClient.setUserRoles(currentUser.roles);

        //todo: Ask for a unified endpoint that will serve all those values in one go.( while ensuring backward-compatibility through fallbacks to previous code-path)
        const teamsRequest = client.getMyTeams();

        // Goes into myTeam table
        const teamMembersRequest = client.getMyTeamMembers();
        const teamUnreadRequest = client.getMyTeamUnreads();

        const preferencesRequest = client.getMyPreferences();
        const configRequest = client.getClientConfigOld();
        const licenseRequest = client.getClientLicenseOld();

        const [
            teams,
            teamMemberships,
            teamUnreads,
            preferences,
            config,
            license,
        ] = await Promise.all([
            teamsRequest,
            teamMembersRequest,
            teamUnreadRequest,
            preferencesRequest,
            configRequest,
            licenseRequest,
        ]);

        const operator = DatabaseManager.serverDatabases[serverUrl].operator;
        const teamRecords = operator.handleTeam({prepareRecordsOnly: true, teams});
        const teamMembershipRecords = operator.handleTeamMemberships({prepareRecordsOnly: true, teamMemberships});

        const myTeams = teamUnreads.map((unread) => {
            const matchingTeam = teamMemberships.find((team) => team.team_id === unread.team_id);
            return {id: unread.team_id, roles: matchingTeam?.roles ?? '', is_unread: unread.msg_count > 0, mentions_count: unread.mention_count};
        });

        const myTeamRecords = operator.handleMyTeam({
            prepareRecordsOnly: true,
            myTeams,
        });

        const systemRecords = operator.handleSystem({
            systems: [
                {
                    id: Database.SYSTEM_IDENTIFIERS.CONFIG,
                    value: JSON.stringify(config),
                },
                {
                    id: Database.SYSTEM_IDENTIFIERS.LICENSE,
                    value: JSON.stringify(license),
                },
                {
                    id: Database.SYSTEM_IDENTIFIERS.CURRENT_USER_ID,
                    value: currentUser.id,
                },
            ],
            prepareRecordsOnly: true,
        });

        const userRecords = operator.handleUsers({
            users: [currentUser],
            prepareRecordsOnly: true,
        });

        const preferenceRecords = operator.handlePreferences({
            prepareRecordsOnly: true,
            preferences,
        });

        let roles: string[] = [];
        for (const role of currentUser.roles.split(' ')) {
            roles = roles.concat(role);
        }

        for (const teamMember of teamMemberships) {
            roles = roles.concat(teamMember.roles.split(' '));
        }

        const rolesToLoad = new Set<string>(roles);

        let rolesRecords: RoleModel[] = [];
        if (rolesToLoad.size > 0) {
            const rolesByName = await client.getRolesByNames(Array.from(rolesToLoad));

            if (rolesByName?.length) {
                rolesRecords = await operator.handleRole({prepareRecordsOnly: true, roles: rolesByName});
            }
        }

        const models = await Promise.all([teamRecords, teamMembershipRecords, myTeamRecords, systemRecords, preferenceRecords, rolesRecords, userRecords]);

        const flattenedModels = models.flat();
        if (flattenedModels?.length > 0) {
            await operator.batchRecords(flattenedModels);
        }
    } catch (e) {
        return {error: e, currentUser: undefined};
    }

    return {currentUser, error: undefined};
};

export const updateMe = async (serverUrl: string, user: UserModel) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    let data: UserProfile;
    try {
        data = await client.patchMe(user._raw);
    } catch (e) {
        forceLogoutIfNecessary(serverUrl, e);
        return {error: e};
    }

    if (data) {
        operator.handleUsers({prepareRecordsOnly: false, users: [data]});

        const updatedRoles: string[] = data.roles.split(' ');
        if (updatedRoles.length) {
            await fetchRolesIfNeeded(serverUrl, updatedRoles);
        }
    }

    return {data};
};

let ids: string[] = [];
const debouncedFetchStatusesByIds = debounce((serverUrl: string) => {
    fetchStatusByIds(serverUrl, [...new Set(ids)]);
}, 200, false, () => {
    ids = [];
});

export const fetchStatusInBatch = (serverUrl: string, id: string) => {
    ids = [...ids, id];
    return debouncedFetchStatusesByIds.apply(null, [serverUrl]);
};

export const fetchStatusByIds = async (serverUrl: string, userIds: string[], fetchOnly = false) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }
    if (!userIds.length) {
        return {statuses: []};
    }

    try {
        const statuses = await client.getStatusesByIds(userIds);

        if (!fetchOnly && DatabaseManager.serverDatabases[serverUrl]) {
            const {database, operator} = DatabaseManager.serverDatabases[serverUrl];
            if (operator) {
                const users = await database.get(Database.MM_TABLES.SERVER.USER).query(Q.where('id', Q.oneOf(userIds))).fetch() as UserModel[];
                for (const user of users) {
                    const status = statuses.find((s) => s.user_id === user.id);
                    user.prepareSatus(status?.status || General.OFFLINE);
                }

                await operator.batchRecords(users);
            }
        }

        return {statuses};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const fetchUsersByIds = async (serverUrl: string, userIds: string[], fetchOnly = false) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }
    if (!userIds.length) {
        return {users: []};
    }

    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const currentUserId = await queryCurrentUserId(operator.database);
        const exisingUsers = await queryUsersById(operator.database, userIds);
        const usersToLoad = userIds.filter((id) => (id !== currentUserId && !exisingUsers.find((u) => u.id === id)));
        const users = await client.getProfilesByIds([...new Set(usersToLoad)]);

        if (!fetchOnly) {
            await operator.handleUsers({
                users,
                prepareRecordsOnly: false,
            });
        }

        return {users};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const fetchUsersByUsernames = async (serverUrl: string, usernames: string[], fetchOnly = false) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }
    if (!usernames.length) {
        return {users: []};
    }

    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const currentUser = await queryCurrentUser(operator.database);
        const exisingUsers = await queryUsersByUsername(operator.database, usernames);
        const usersToLoad = usernames.filter((username) => (username !== currentUser?.username && !exisingUsers.find((u) => u.username === username)));
        const users = await client.getProfilesByUsernames([...new Set(usersToLoad)]);

        if (!fetchOnly) {
            await operator.handleUsers({
                users,
                prepareRecordsOnly: false,
            });
        }

        return {users};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const fetchMissinProfilesByIds = async (serverUrl: string, userIds: string[]) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const {users} = await fetchUsersByIds(serverUrl, userIds);
        if (users) {
            const statusToLoad = users.map((u) => u.id);
            fetchStatusByIds(serverUrl, statusToLoad);
        }
        return {users};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const fetchMissinProfilesByUsernames = async (serverUrl: string, usernames: string[]) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const {users} = await fetchUsersByUsernames(serverUrl, usernames);
        if (users) {
            const statusToLoad = users.map((u) => u.id);
            fetchStatusByIds(serverUrl, statusToLoad);
        }
        return {users};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};
