// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import General from '@constants/general';
import DatabaseManager from '@database/manager';
import {getRecentCustomStatuses} from '@queries/servers/system';
import {getCurrentUser, getUserById} from '@queries/servers/user';

import {addRecentReaction} from './reactions';

import type Model from '@nozbe/watermelondb/Model';
import type UserModel from '@typings/database/models/servers/user';

export async function setCurrentUserStatusOffline(serverUrl: string) {
    const serverDatabase = DatabaseManager.serverDatabases[serverUrl];
    if (!serverDatabase) {
        return {error: `No database present for ${serverUrl}`};
    }

    const {database, operator} = serverDatabase;

    const user = await getCurrentUser(database);
    if (!user) {
        return {error: `No current user for ${serverUrl}`};
    }

    user.prepareStatus(General.OFFLINE);

    try {
        await operator.batchRecords([user]);
    } catch {
        // eslint-disable-next-line no-console
        console.log('FAILED TO BATCH CHANGES FOR SET CURRENT USER STATUS OFFLINE');
    }

    return null;
}

export async function updateLocalCustomStatus(serverUrl: string, user: UserModel, customStatus?: UserCustomStatus) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const models: Model[] = [];
    const currentProps = {...user.props, customStatus: customStatus || {}};
    const userModel = user.prepareUpdate((u: UserModel) => {
        u.props = currentProps;
    });

    models.push(userModel);
    if (customStatus) {
        const recent = await updateRecentCustomStatuses(serverUrl, customStatus, true);
        if (Array.isArray(recent)) {
            models.push(...recent);
        }

        if (customStatus.emoji) {
            const recentEmojis = await addRecentReaction(serverUrl, [customStatus.emoji], true);
            if (Array.isArray(recentEmojis)) {
                models.push(...recentEmojis);
            }
        }
    }

    try {
        await operator.batchRecords(models);
    } catch {
        // eslint-disable-next-line no-console
        console.log('FAILED TO BATCH CHANGES FOR UPDATING CUSTOM STATUS');
    }

    return {};
}

export const updateRecentCustomStatuses = async (serverUrl: string, customStatus: UserCustomStatus, prepareRecordsOnly = false, remove = false) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const recentStatuses = await getRecentCustomStatuses(operator.database);
    const index = recentStatuses.findIndex((cs) => (
        cs.emoji === customStatus.emoji &&
        cs.text === customStatus.text &&
        cs.duration === customStatus.duration
    ));

    if (index !== -1) {
        recentStatuses.splice(index, 1);
    }

    if (!remove) {
        recentStatuses.unshift(customStatus);
    }

    return operator.handleSystem({
        systems: [{
            id: SYSTEM_IDENTIFIERS.RECENT_CUSTOM_STATUS,
            value: JSON.stringify(recentStatuses),
        }],
        prepareRecordsOnly,
    });
};

export const updateLocalUser = async (
    serverUrl: string,
    userDetails: Partial<UserProfile> & { status?: string},
) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const user = await getCurrentUser(database);
        if (user) {
            await database.write(async () => {
                await user.update((userRecord: UserModel) => {
                    userRecord.authService = userDetails.auth_service ?? user.authService;
                    userRecord.email = userDetails.email ?? user.email;
                    userRecord.firstName = userDetails.first_name ?? user.firstName;
                    userRecord.lastName = userDetails.last_name ?? user.lastName;
                    userRecord.lastPictureUpdate = userDetails.last_picture_update ?? user.lastPictureUpdate;
                    userRecord.locale = userDetails.locale ?? user.locale;
                    userRecord.nickname = userDetails.nickname ?? user.nickname;
                    userRecord.notifyProps = userDetails.notify_props ?? user.notifyProps;
                    userRecord.position = userDetails?.position ?? user.position;
                    userRecord.props = userDetails.props ?? user.props;
                    userRecord.roles = userDetails.roles ?? user.roles;
                    userRecord.status = userDetails?.status ?? user.status;
                    userRecord.timezone = userDetails.timezone ?? user.timezone;
                    userRecord.username = userDetails.username ?? user.username;
                });
            });
        }
    } catch (error) {
        return {error};
    }

    return {};
};

export const storeProfile = async (serverUrl: string, profile: UserProfile) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const {database} = operator;
        const user = await getUserById(database, profile.id);
        if (user) {
            return {user};
        }

        const records = await operator.handleUsers({
            users: [profile],
            prepareRecordsOnly: false,
        });

        return {user: records[0]};
    } catch (error) {
        return {error};
    }
};
