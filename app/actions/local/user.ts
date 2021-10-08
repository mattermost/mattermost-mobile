// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import General from '@constants/general';
import DatabaseManager from '@database/manager';
import {queryCurrentUser} from '@queries/servers/user';

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

    user.prepareSatus(General.OFFLINE);
    await operator.batchRecords([user]);

    return null;
};
