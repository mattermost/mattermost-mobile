// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import urlParse from 'url-parse';

import DatabaseConnectionException from '@database/exceptions/database_connection_exception';
import DatabaseManager from '@database/manager';

type SetActiveDatabaseArgs = {
  serverUrl: string;
  displayName?: string;
};

export const createAndSetActiveDatabase = async ({serverUrl, displayName}: SetActiveDatabaseArgs) => {
    const connectionName = displayName ?? urlParse(serverUrl)?.hostname;

    try {
        const databaseClient = new DatabaseManager();
        await databaseClient.getDatabaseConnection({serverUrl, connectionName, setAsActiveDatabase: true});
    } catch (e) {
        throw new DatabaseConnectionException(
            `createAndSetActiveDatabase: Unable to create and set serverUrl ${serverUrl} as current active database with name ${displayName}`,
        );
    }
};

export const getDefaultDatabase = async () => {
    try {
        const databaseClient = new DatabaseManager();
        const defaultDatabase = await databaseClient.getDefaultDatabase();
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
        const databaseClient = new DatabaseManager();
        const activeServerDatabase = await databaseClient.getActiveServerDatabase();

        return {
            error: activeServerDatabase ? null : 'Unable to retrieve the current active server database.',
            activeServerDatabase,
        };
    } catch (e) {
        return {
            error: 'Unable to retrieve the current active server database.',
            activeServerDatabase: null,
        };
    }
};
