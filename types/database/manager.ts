// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Database} from '@nozbe/watermelondb';
import type {AppDatabase, ServerDatabase, ServerDatabases} from '@typings/database/database';

export type DatabaseManager = {
    serverDatabases: ServerDatabases;

    updateServerIdentifier: (serverUrl: string, identifier: string, displayName?: string) => Promise<void>;

    updateServerDisplayName: (serverUrl: string, displayName: string) => Promise<void>;

    isServerPresent: (serverUrl: string) => Promise<boolean>;

    getActiveServerUrl: () => Promise<string|undefined>;

    getActiveServerDisplayName: () => Promise<string|undefined>;

    getServerUrlFromIdentifier: (identifier: string) => Promise<string|undefined>;

    getActiveServerDatabase: () => Promise<Database|undefined>;

    getAppDatabaseAndOperator: () => AppDatabase|undefined;

    getServerDatabaseAndOperator: (serverUrl: string) => ServerDatabase | undefined;

    setActiveServerDatabase: (serverUrl: string) => Promise<void>;

    deleteServerDatabase: (serverUrl: string) => Promise<void>;

    destroyServerDatabase: (serverUrl: string) => Promise<void>;

    deleteServerDatabaseFiles: (serverUrl: string) => Promise<void>;

    deleteServerDatabaseFilesByName: (databaseName: string) => Promise<void>;

    renameDatabase: (databaseName: string, newDBName: string) => Promise<void>;

    factoryReset: (shouldRemoveDirectory: boolean) => Promise<boolean>;

    getDatabaseFilePath: (dbName: string) => string;

    searchUrl: (toFind: string) => string | undefined;
}
