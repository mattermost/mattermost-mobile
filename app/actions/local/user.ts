// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import General from '@constants/general';
import DatabaseManager from '@database/manager';
import {queryRecentCustomStatuses} from '@queries/servers/system';
import {queryCurrentUser, queryUserById} from '@queries/servers/user';

import {addRecentReaction} from './reactions';

import type Model from '@nozbe/watermelondb/Model';
import type UserModel from '@typings/database/models/servers/user';

export const setCurrentUserStatusOffline = async (serverUrl: string) => {
    const serverDatabase = DatabaseManager.serverDatabases[serverUrl];
    if (!serverDatabase) {
        return {error: `No database present for ${serverUrl}`};
    }

    const {database, operator} = serverDatabase;

    const user = await queryCurrentUser(database);
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
};

export const updateLocalCustomStatus = async (serverUrl: string, user: UserModel, customStatus?: UserCustomStatus) => {
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
            const recentEmojis = await addRecentReaction(serverUrl, customStatus.emoji, true);
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
};

export const updateRecentCustomStatuses = async (serverUrl: string, customStatus: UserCustomStatus, prepareRecordsOnly = false, remove = false) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const recent = await queryRecentCustomStatuses(operator.database);
    const recentStatuses = (recent ? recent.value : []) as UserCustomStatus[];
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

export const updateUserPresence = async (serverUrl: string, userStatus: UserStatus) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const user = await queryUserById(operator.database, userStatus.user_id);
    if (user) {
        user.prepareUpdate((record) => {
            record.status = userStatus.status;
        });
        try {
            await operator.batchRecords([user]);
        } catch {
            // eslint-disable-next-line no-console
            console.log('FAILED TO BATCH CHANGES FOR UPDATE USER PRESENCE');
        }
    }

    return {};
};

