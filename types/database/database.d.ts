// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {Migration} from '@nozbe/watermelondb/Schema/migrations';
import {AppSchema, Database} from '@nozbe/watermelondb';

export type MigrationEvents = {
    onSuccess: () => void,
    onStarted: () => void,
    onFailure: (error: string) => void,
}

export type MMAdaptorOptions = {
    dbPath : string,
    schema: AppSchema,
    migrationSteps?: Migration [],
    migrationEvents?: MigrationEvents
}

export type MMDatabaseConnection = {
    actionsEnabled?: boolean,
    dbName: string,
    dbType?: DatabaseType.DEFAULT | DatabaseType.SERVER,
    serverUrl?: string,
}

export type DefaultNewServer = {
    databaseFilePath: string,
    displayName: string,
    serverUrl: string
}

// A database connection is of type 'Database'; unless it fails to be initialize and in which case it becomes 'undefined'
type DBInstance = Database | undefined
