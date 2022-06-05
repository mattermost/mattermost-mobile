// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import {Model} from '@nozbe/watermelondb';
import {chunk} from 'lodash';

import {updateChannelsDisplayName} from '@actions/local/channel';
import {getUserTimezone} from '@actions/local/timezone';
import {updateRecentCustomStatuses, updateLocalUser} from '@actions/local/user';
import {fetchRolesIfNeeded} from '@actions/remote/role';
import {General} from '@constants';
import DatabaseManager from '@database/manager';
import {debounce} from '@helpers/api/general';
import NetworkManager from '@managers/network_manager';
import {getMembersCountByChannelsId, queryChannelsByTypes} from '@queries/servers/channel';
import {getCurrentTeamId, getCurrentUserId} from '@queries/servers/system';
import {getCurrentUser, getUserById, prepareUsers, queryAllUsers, queryUsersById, queryUsersByUsername} from '@queries/servers/user';
import {removeUserFromList} from '@utils/user';

import {forceLogoutIfNecessary} from './session';

import type {Client} from '@client/rest';
import type ClientError from '@client/rest/error';
import type UserModel from '@typings/database/models/servers/user';

export type MyUserRequest = {
    user?: UserProfile;
    error?: unknown;
}

export type ProfilesPerChannelRequest = {
    data?: ProfilesInChannelRequest[];
    error?: unknown;
}

export type ProfilesInChannelRequest = {
    users?: UserProfile[];
    channelId: string;
    error?: unknown;
}

export const fetchMe = async (serverUrl: string, fetchOnly = false): Promise<MyUserRequest> => {
    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const [user, userStatus] = await Promise.all<[Promise<UserProfile>, Promise<UserStatus>]>([
            client.getMe(),
            client.getStatus('me'),
        ]);

        user.status = userStatus.status;

        if (!fetchOnly) {
            const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
            if (operator) {
                await operator.handleUsers({users: [user], prepareRecordsOnly: false});
            }
        }

        return {user};
    } catch (error) {
        await forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export async function fetchProfilesInChannel(serverUrl: string, channelId: string, excludeUserId?: string, fetchOnly = false): Promise<ProfilesInChannelRequest> {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {channelId, error};
    }

    try {
        const users = await client.getProfilesInChannel(channelId);
        const uniqueUsers = Array.from(new Set(users));
        const filteredUsers = uniqueUsers.filter((u) => u.id !== excludeUserId);
        if (!fetchOnly) {
            const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
            if (operator && filteredUsers.length) {
                const modelPromises: Array<Promise<Model[]>> = [];
                const membership = filteredUsers.map((u) => ({
                    channel_id: channelId,
                    user_id: u.id,
                }));
                modelPromises.push(operator.handleChannelMembership({
                    channelMemberships: membership,
                    prepareRecordsOnly: true,
                }));
                const prepare = prepareUsers(operator, filteredUsers);
                modelPromises.push(prepare);

                const models = await Promise.all(modelPromises);
                await operator.batchRecords(models.flat());
            }
        }

        return {channelId, users: filteredUsers};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientError);
        return {channelId, error};
    }
}

export async function fetchProfilesInGroupChannels(serverUrl: string, groupChannelIds: string[], fetchOnly = false): Promise<ProfilesPerChannelRequest> {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const {database} = operator;

    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        // let's filter those channels that we already have the users
        const membersCount = await getMembersCountByChannelsId(database, groupChannelIds);
        const channelsToFetch = groupChannelIds.filter((c) => membersCount[c] <= 1);
        if (!channelsToFetch.length) {
            return {data: []};
        }

        // Batch fetching profiles per channel by chunks of 50
        const gms = chunk(channelsToFetch, 50);
        const data: ProfilesInChannelRequest[] = [];

        const requests = gms.map((cIds) => client.getProfilesInGroupChannels(cIds));
        const response = await Promise.all(requests);
        for (const r of response) {
            for (const id in r) {
                if (r[id]) {
                    data.push({
                        channelId: id,
                        users: r[id],
                    });
                }
            }
        }

        if (!fetchOnly) {
            const modelPromises: Array<Promise<Model[]>> = [];
            const users = new Set<UserProfile>();
            const memberships: Array<{channel_id: string; user_id: string}> = [];
            for (const item of data) {
                if (item.users?.length) {
                    for (const u of item.users) {
                        users.add(u);
                        memberships.push({channel_id: item.channelId, user_id: u.id});
                    }
                }
            }
            if (memberships.length) {
                modelPromises.push(operator.handleChannelMembership({
                    channelMemberships: memberships,
                    prepareRecordsOnly: true,
                }));
            }
            if (users.size) {
                const prepare = prepareUsers(operator, Array.from(users));
                modelPromises.push(prepare);
            }

            const models = await Promise.all(modelPromises);
            await operator.batchRecords(models.flat());
        }

        return {data};
    } catch (error) {
        return {error};
    }
}

export async function fetchProfilesPerChannels(serverUrl: string, channelIds: string[], excludeUserId?: string, fetchOnly = false): Promise<ProfilesPerChannelRequest> {
    try {
        const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
        if (!operator) {
            return {error: `${serverUrl} database not found`};
        }

        const {database} = operator;

        // let's filter those channels that we already have the users
        const membersCount = await getMembersCountByChannelsId(database, channelIds);
        const channelsToFetch = channelIds.filter((c) => membersCount[c] <= 1);
        if (!channelsToFetch.length) {
            return {data: []};
        }

        // Batch fetching profiles per channel by chunks of 300
        const channels = chunk(channelsToFetch, 300);
        const data: ProfilesInChannelRequest[] = [];

        for await (const cIds of channels) {
            const requests = cIds.map((id) => fetchProfilesInChannel(serverUrl, id, excludeUserId, true));
            const response = await Promise.all(requests);
            data.push(...response);
        }

        if (!fetchOnly) {
            const modelPromises: Array<Promise<Model[]>> = [];
            const users = new Set<UserProfile>();
            const memberships: Array<{channel_id: string; user_id: string}> = [];
            for (const item of data) {
                if (item.users?.length) {
                    for (const u of item.users) {
                        if (u.id !== excludeUserId) {
                            users.add(u);
                            memberships.push({channel_id: item.channelId, user_id: u.id});
                        }
                    }
                }
            }
            if (memberships.length) {
                modelPromises.push(operator.handleChannelMembership({
                    channelMemberships: memberships,
                    prepareRecordsOnly: true,
                }));
            }
            if (users.size) {
                const prepare = prepareUsers(operator, Array.from(users));
                modelPromises.push(prepare);
            }

            const models = await Promise.all(modelPromises);
            await operator.batchRecords(models.flat());
        }

        return {data};
    } catch (error) {
        return {error};
    }
}

export const updateMe = async (serverUrl: string, user: Partial<UserProfile>) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
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
        data = await client.patchMe(user);
    } catch (e) {
        forceLogoutIfNecessary(serverUrl, e as ClientError);
        return {error: e};
    }

    if (data) {
        operator.handleUsers({prepareRecordsOnly: false, users: [data]});

        const updatedRoles: string[] = data.roles.split(' ');
        await fetchRolesIfNeeded(serverUrl, updatedRoles);
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

export async function fetchStatusByIds(serverUrl: string, userIds: string[], fetchOnly = false) {
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
                const users = await queryUsersById(database, userIds).fetch();
                const userStatuses = statuses.reduce((result: Record<string, UserStatus>, s) => {
                    result[s.user_id] = s;
                    return result;
                }, {});

                for (const user of users) {
                    const status = userStatuses[user.id];
                    user.prepareStatus(status?.status || General.OFFLINE);
                }

                await operator.batchRecords(users);
            }
        }

        return {statuses};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientError);
        return {error};
    }
}

export const fetchUsersByIds = async (serverUrl: string, userIds: string[], fetchOnly = false) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }
    if (!userIds.length) {
        return {users: [], existingUsers: []};
    }

    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const currentUser = await getCurrentUser(operator.database);
        const existingUsers = await queryUsersById(operator.database, userIds).fetch();
        if (userIds.includes(currentUser!.id)) {
            existingUsers.push(currentUser!);
        }
        const exisitingUsersMap = existingUsers.reduce((result: Record<string, UserModel>, u) => {
            result[u.id] = u;
            return result;
        }, {});
        const usersToLoad = new Set(userIds.filter((id) => !exisitingUsersMap[id]));
        if (usersToLoad.size === 0) {
            return {users: [], existingUsers};
        }
        const users = await client.getProfilesByIds([...new Set(usersToLoad)]);
        if (!fetchOnly) {
            await operator.handleUsers({
                users,
                prepareRecordsOnly: false,
            });
        }

        return {users, existingUsers};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientError);
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
        const currentUser = await getCurrentUser(operator.database);
        const existingUsers = await queryUsersByUsername(operator.database, usernames).fetch();
        const exisitingUsersMap = existingUsers.reduce((result: Record<string, UserModel>, u) => {
            result[u.username] = u;
            return result;
        }, {});
        const usersToLoad = usernames.filter((username) => (username !== currentUser?.username && !exisitingUsersMap[username]));
        if (!usersToLoad.length) {
            return {users: []};
        }

        const users = await client.getProfilesByUsernames([...new Set(usersToLoad)]);

        if (!fetchOnly) {
            await operator.handleUsers({
                users,
                prepareRecordsOnly: false,
            });
        }

        return {users};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientError);
        return {error};
    }
};

export const fetchProfiles = async (serverUrl: string, page = 0, perPage: number = General.PROFILE_CHUNK_SIZE, options: any = {}, fetchOnly = false) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const users = await client.getProfiles(page, perPage, options);

        if (!fetchOnly) {
            const currentUserId = await getCurrentUserId(operator.database);
            const toStore = removeUserFromList(currentUserId, users);
            await operator.handleUsers({
                users: toStore,
                prepareRecordsOnly: false,
            });
        }

        return {users};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientError);
        return {error};
    }
};

export const fetchProfilesInTeam = async (serverUrl: string, teamId: string, page = 0, perPage: number = General.PROFILE_CHUNK_SIZE, sort = '', options: any = {}, fetchOnly = false) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const users = await client.getProfilesInTeam(teamId, page, perPage, sort, options);

        if (!fetchOnly) {
            const currentUserId = await getCurrentUserId(operator.database);
            const toStore = removeUserFromList(currentUserId, users);

            await operator.handleUsers({
                users: toStore,
                prepareRecordsOnly: false,
            });
        }

        return {users};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientError);
        return {error};
    }
};

export const searchProfiles = async (serverUrl: string, term: string, options: any = {}, fetchOnly = false) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const currentUserId = await getCurrentUserId(operator.database);
        const users = await client.searchUsers(term, options);

        if (!fetchOnly) {
            const {database} = operator;
            const existing = await queryUsersById(database, users.map((u) => u.id)).fetchIds();
            const existingSet = new Set(existing);
            const usersToAdd = users.filter((u) => !existingSet.has(u.id));
            const toStore = removeUserFromList(currentUserId, usersToAdd);
            if (toStore.length) {
                await operator.handleUsers({
                    users: toStore,
                    prepareRecordsOnly: false,
                });
            }
        }

        return {data: users};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientError);
        return {error};
    }
};

export const fetchMissingProfilesByIds = async (serverUrl: string, userIds: string[]) => {
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
        forceLogoutIfNecessary(serverUrl, error as ClientError);
        return {error};
    }
};

export const fetchMissingProfilesByUsernames = async (serverUrl: string, usernames: string[]) => {
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
        forceLogoutIfNecessary(serverUrl, error as ClientError);
        return {error};
    }
};

export async function updateAllUsersSince(serverUrl: string, since: number, fetchOnly = false) {
    if (!since) {
        return {users: []};
    }

    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }
    const database = operator.database;

    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    const currentUserId = await getCurrentUserId(database);
    const userIds = (await queryAllUsers(database).fetchIds()).filter((id) => id !== currentUserId);
    let userUpdates: UserProfile[] = [];
    try {
        userUpdates = await client.getProfilesByIds(userIds, {since});
        if (userUpdates.length && !fetchOnly) {
            const modelsToBatch: Model[] = [];
            const userModels = await operator.handleUsers({users: userUpdates, prepareRecordsOnly: true});
            modelsToBatch.push(...userModels);
            const directChannels = await queryChannelsByTypes(database, [General.DM_CHANNEL, General.GM_CHANNEL]).fetch();
            const {models} = await updateChannelsDisplayName(serverUrl, directChannels, userUpdates, true);
            if (models?.length) {
                modelsToBatch.push(...models);
            }

            await operator.batchRecords(modelsToBatch);
        }
    } catch {
        // Do nothing
    }

    return {users: userUpdates};
}

export async function updateUsersNoLongerVisible(serverUrl: string, prepareRecordsOnly = false): Promise<{error?: unknown; models?: Model[]}> {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    const serverDatabase = DatabaseManager.serverDatabases[serverUrl];
    if (!serverDatabase) {
        return {error: `${serverUrl} database not found`};
    }

    const models: Model[] = [];
    try {
        const knownUsers = new Set(await client.getKnownUsers());
        const currentUserId = await getCurrentUserId(serverDatabase.database);
        knownUsers.add(currentUserId);

        const allUsers = await queryAllUsers(serverDatabase.database).fetch();
        for (const user of allUsers) {
            if (!knownUsers.has(user.id)) {
                user.prepareDestroyPermanently();
                models.push(user);
            }
        }
        if (models.length && !prepareRecordsOnly) {
            serverDatabase.operator.batchRecords(models);
        }
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientError);
        return {error};
    }

    return {models};
}

export const setStatus = async (serverUrl: string, status: UserStatus) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const data = await client.updateStatus(status);
        await updateLocalUser(serverUrl, {status: status.status});

        return {
            data,
        };
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const updateCustomStatus = async (serverUrl: string, customStatus: UserCustomStatus) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        if (!customStatus.duration) {
            delete customStatus.expires_at;
        }
        await client.updateCustomStatus(customStatus);
        return {data: true};
    } catch (error) {
        return {error};
    }
};

export const removeRecentCustomStatus = async (serverUrl: string, customStatus: UserCustomStatus) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    updateRecentCustomStatuses(serverUrl, customStatus, false, true);

    try {
        await client.removeRecentCustomStatus(customStatus);
    } catch (error) {
        return {error};
    }

    return {data: true};
};

export const unsetCustomStatus = async (serverUrl: string) => {
    let client: Client;

    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        await client.unsetCustomStatus();
    } catch (error) {
        return {error};
    }

    return {data: true};
};

export const setDefaultProfileImage = async (serverUrl: string, userId: string) => {
    let client: Client;

    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        await client.setDefaultProfileImage(userId);
        updateLocalUser(serverUrl, {last_picture_update: Date.now()});
    } catch (error) {
        return {error};
    }

    return {data: true};
};

export const uploadUserProfileImage = async (serverUrl: string, localPath: string) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const currentUser = await getCurrentUser(database);
        if (currentUser) {
            const endpoint = `${client.getUserRoute(currentUser.id)}/image`;

            await client.apiClient.upload(endpoint, localPath, {
                skipBytes: 0,
                method: 'POST',
                multipart: {
                    fileKey: 'image',
                },
            });
        }
    } catch (e) {
        return {error: e};
    }
    return {error: undefined};
};

export const searchUsers = async (serverUrl: string, term: string, channelId?: string) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const currentTeamId = await getCurrentTeamId(database);
        const users = await client.autocompleteUsers(term, currentTeamId, channelId);
        return {users};
    } catch (error) {
        return {error};
    }
};

export const buildProfileImageUrl = (serverUrl: string, userId: string, timestamp = 0) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return '';
    }

    return client.getProfilePictureUrl(userId, timestamp);
};

export const autoUpdateTimezone = async (serverUrl: string, {deviceTimezone, userId}: {deviceTimezone: string; userId: string}) => {
    const database = DatabaseManager.serverDatabases[serverUrl].database;
    if (!database) {
        return {error: `No database present for ${serverUrl}`};
    }

    const currentUser = await getUserById(database, userId);

    if (!currentUser) {
        return null;
    }

    const currentTimezone = getUserTimezone(currentUser);
    const newTimezoneExists = currentTimezone.automaticTimezone !== deviceTimezone;

    if (currentTimezone.useAutomaticTimezone && newTimezoneExists) {
        const timezone = {useAutomaticTimezone: 'true', automaticTimezone: deviceTimezone, manualTimezone: currentTimezone.manualTimezone};
        await updateMe(serverUrl, {timezone});
    }
    return null;
};

export const fetchTeamAndChannelMembership = async (serverUrl: string, userId: string, teamId: string, channelId?: string) => {
    const operator = DatabaseManager.serverDatabases[serverUrl].operator;
    if (!operator) {
        return {error: `No database present for ${serverUrl}`};
    }

    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const requests = await Promise.all([
            client.getTeamMember(teamId, userId),
            channelId ? client.getChannelMember(channelId, userId) : undefined,
        ]);

        const modelPromises: Array<Promise<Model[]>> = [];
        modelPromises.push(operator.handleTeamMemberships({
            teamMemberships: [requests[0]],
            prepareRecordsOnly: true,
        }));
        const channelMemberships = requests[1];
        if (channelMemberships) {
            modelPromises.push(operator.handleChannelMembership({
                channelMemberships: [channelMemberships],
                prepareRecordsOnly: true,
            }));
        }

        const models = await Promise.all(modelPromises);
        await operator.batchRecords(models.flat());
        return {error: undefined};
    } catch (error) {
        return {error};
    }
};
