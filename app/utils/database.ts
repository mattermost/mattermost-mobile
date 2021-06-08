// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseConnectionException from '@database/exceptions/database_connection_exception';
import DatabaseManager from '@database/manager';

type SetActiveDatabaseArgs = {
  serverUrl: string;
  displayName: string;
};

export const createAndSetActiveDatabase = async ({
    serverUrl,
    displayName,
}: SetActiveDatabaseArgs) => {
    if (!displayName) {
        throw new DatabaseConnectionException(
            `createAndSetActiveDatabase: Unable to create and set serverUrl ${serverUrl} as current active database with name ${displayName}`,
        );
    }
    try {
        await DatabaseManager.setMostRecentServerConnection(serverUrl);
    } catch (e) {
        throw new DatabaseConnectionException(
            `createAndSetActiveDatabase: Unable to create and set serverUrl ${serverUrl} as current active database with name ${displayName}`,
        );
    }
};

export const getDefaultDatabase = async () => {
    try {
        const defaultDatabase = await DatabaseManager.getDefaultDatabase();
        return {
            error: defaultDatabase ? null : 'Unable to retrieve the App database.',
            defaultDatabase,
        };
    } catch (e) {
        return {
            error: 'Unable to retrieve the App database.',
            defaultDatabase: null,
        };
    }
};

export const getActiveServerDatabase = async () => {
    try {
        const activeServerDatabase = await DatabaseManager.getMostRecentServerConnection();

        return {
            error: activeServerDatabase ? null : 'Unable to retrieve the current active server database.',
            activeServerDatabase: activeServerDatabase ?? null,
        };
    } catch (e) {
        return {
            error: 'Unable to retrieve the current active server database.',
            activeServerDatabase: null,
        };
    }
};
