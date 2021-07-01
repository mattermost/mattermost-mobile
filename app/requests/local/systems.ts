// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';

export const createSessions = async (serverUrl: string, sessions: any) => {
    const database = DatabaseManager.serverDatabases[serverUrl].database;
    const operator = DatabaseManager.serverDatabases[serverUrl].operator;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    await operator.handleSystem({
        systems: [{id: 'sessions', value: sessions}],
        prepareRecordsOnly: false,
    });

    return null;
};
