// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {queryCurrentUser} from '@app/queries/servers/user';
import General from '@constants/general';
import DatabaseManager from '@database/manager';

export const setCurrentUserStatusOffline = async (serverUrl: string) => {
    const serverDatabase = DatabaseManager.serverDatabases[serverUrl];
    if (!serverDatabase) {
        return null;
    }

    const {database, operator} = serverDatabase;
    if (!database) {
        return {error: `No database present for ${serverUrl}`};
    }

    const user = await queryCurrentUser(database);
    if (!user) {
        return {error: `No current user for ${serverUrl}`};
    }

    user.prepareSatus(General.OFFLINE);
    await operator.batchRecords([user]);

    return null;
};
