// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';

import type Model from '@nozbe/watermelondb/Model';
import type UserModel from '@typings/database/models/servers/user';

type UpdateUserCustomStatusArgs = {
    recentStatuses?: UserCustomStatus[];
    serverUrl: string;
    status?: UserCustomStatus;
    user: UserModel;
};
export const updateLocalCustomStatus = async ({
    recentStatuses,
    serverUrl,
    status,
    user,
}: UpdateUserCustomStatusArgs) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;

    try {
        let models: Model[] = [];

        const currentProps = {
            ...user.props,
            customStatus: status ? {...status} : {},
        };
        const userModel = user.prepareUpdate((u: UserModel) => {
            u.props = currentProps;
        });

        models.push(userModel);

        if (status && recentStatuses) {
            recentStatuses.unshift(status);

            const systemModels: Model[] = await operator?.handleSystem({
                prepareRecordsOnly: true,
                systems: [
                    {
                        id: SYSTEM_IDENTIFIERS.RECENT_CUSTOM_STATUS,
                        value: JSON.stringify(recentStatuses),
                    },
                ],
            });
            if (systemModels.length) {
                models = models.concat(systemModels);
            }
        }
        await operator?.batchRecords(models);
    } catch (e) {
        //does nothing - if we get to this point, that means that the Custom Status has been updated on the server and the status in the app will be refreshed via another medium (e.g. WebSocket)
    }
};

export const updateUserProfile = async (serverUrl: string, user: UserModel, userInfo: UserInfo) => {
    const database = DatabaseManager.serverDatabases[serverUrl].database;
    if (!database) {
        return {error: `No database present for ${serverUrl}`};
    }

    try {
        const {email, firstName, lastName, nickname, position, username} = userInfo;

        await database.write(async () => {
            await user.update((u: UserModel) => {
                u.email = email;
                u.firstName = firstName;
                u.lastName = lastName;
                u.nickname = nickname;
                u.position = position;
                u.username = username;
            });
        });
        console.log('>>>  updatedUser', {updatedUser});
        return {data: true};
    } catch (error) {
        return {error};
    }
};
