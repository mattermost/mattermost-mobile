// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model, Q} from '@nozbe/watermelondb';
import {chunk} from 'lodash';

import {updateChannelsDisplayName} from '@actions/local/channel';
import {updateRecentCustomStatuses, updateLocalUser} from '@actions/local/user';
import {fetchRolesIfNeeded} from '@actions/remote/role';
import {Database, General} from '@constants';
import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';
import {debounce} from '@helpers/api/general';
import NetworkManager from '@init/network_manager';
import {queryCurrentUserId} from '@queries/servers/system';
import {prepareUsers, queryAllUsers, queryCurrentUser, queryUsersById, queryUsersByUsername} from '@queries/servers/user';

import {forceLogoutIfNecessary} from './session';

import type {Client} from '@client/rest';
import type ClientError from '@client/rest/error';
import type ChannelModel from '@typings/database/models/servers/channel';
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

const {SERVER: {CHANNEL}} = MM_TABLES;

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
                if (prepare) {
                    modelPromises.push(prepare);
                }

                if (modelPromises.length) {
                    const models = await Promise.all(modelPromises);
                    await operator.batchRecords(models.flat());
                }
            }
        }

        return {channelId, users: filteredUsers};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientError);
        return {channelId, error};
    }
};

export const fetchProfilesPerChannels = async (serverUrl: string, channelIds: string[], excludeUserId?: string, fetchOnly = false): Promise<ProfilesPerChannelRequest> => {
    try {
        // Batch fetching profiles per channel by chunks of 50
        const channels = chunk(channelIds, 50);
        const data: ProfilesInChannelRequest[] = [];
        for await (const cIds of channels) {
            const requests = cIds.map((id) => fetchProfilesInChannel(serverUrl, id, excludeUserId, true));
            const response = await Promise.all(requests);
            data.push(...response);
        }

        if (!fetchOnly) {
            const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
            if (operator) {
                const modelPromises: Array<Promise<Model[]>> = [];
                const users = new Set<UserProfile>();
                const memberships: Array<{channel_id: string; user_id: string}> = [];
                for (const item of data) {
                    if (item.users?.length) {
                        item.users.forEach((u) => {
                            users.add(u);
                            memberships.push({channel_id: item.channelId, user_id: u.id});
                        });
                    }
                }
                modelPromises.push(operator.handleChannelMembership({
                    channelMemberships: memberships,
                    prepareRecordsOnly: true,
                }));
                const prepare = prepareUsers(operator, Array.from(users).filter((u) => u.id !== excludeUserId));
                if (prepare) {
                    modelPromises.push(prepare);
                }

                if (modelPromises.length) {
                    const models = await Promise.all(modelPromises);
                    await operator.batchRecords(models.flat());
                }
            }
        }

        return {data};
    } catch (error) {
        return {error};
    }
};

export const updateMe = async (serverUrl: string, user: Partial<UserProfile>) => {
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
        data = await client.patchMe(user);
    } catch (e) {
        forceLogoutIfNecessary(serverUrl, e as ClientError);
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

export const updateAllUsersSince = async (serverUrl: string, since: number, fetchOnly = false) => {
    if (!since) {
        return {users: []};
    }

    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    const currentUserId = await queryCurrentUserId(operator.database);
    const users = await queryAllUsers(operator.database);
    const userIds = users.map((u) => u.id).filter((id) => id !== currentUserId);
    let userUpdates: UserProfile[] = [];
    try {
        userUpdates = await client.getProfilesByIds(userIds, {since});
        if (userUpdates.length && !fetchOnly) {
            const modelsToBatch: Model[] = [];
            const userModels = await operator.handleUsers({users: userUpdates, prepareRecordsOnly: true});
            modelsToBatch.push(...userModels);
            const directChannels = await operator.database.get<ChannelModel>(CHANNEL).
                query(Q.where('type', Q.oneOf([General.DM_CHANNEL, General.GM_CHANNEL]))).
                fetch();
            const {models} = await updateChannelsDisplayName(serverUrl, directChannels, userUpdates, true);
            if (models?.length) {
                modelsToBatch.push(...models);
            }

            if (modelsToBatch.length) {
                await operator.batchRecords(modelsToBatch);
            }
        }
    } catch {
        // Do nothing
    }

    return {users: userUpdates};
};

export const updateUsersNoLongerVisible = async (serverUrl: string, prepareRecordsOnly = false): Promise<{error?: unknown; models?: Model[]}> => {
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
        const currentUserId = await queryCurrentUserId(serverDatabase.database);
        knownUsers.add(currentUserId);

        const allUsers = await queryAllUsers(serverDatabase.database);
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
};

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

export const updateCustomStatus = async (serverUrl: string, user: UserModel, customStatus: UserCustomStatus) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
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
        const currentUser = await queryCurrentUser(database);
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

export const buildProfileImageUrl = (serverUrl: string, userId: string, timestamp = 0) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return '';
    }

    return client.getProfilePictureUrl(userId, timestamp);
};
