// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SQLiteAdapterOptions} from '@nozbe/watermelondb/adapters/sqlite';
import {schemaMigrations} from '@nozbe/watermelondb/Schema/migrations';
import {MMAdaptorOptions} from '@typings/database';
import {defaultSchema} from '../default/schema';

/**
 * Creates an adapter options object that will be used by the database manager.
 * @param {string} dbPath - The dbName or filePath (e.g. AppGroup path) for the database
 * @param {import type {AppSchema} from '@nozbe/watermelondb'} schema - The schema to be used for this connection
 * @param {Migration} migrationSteps - The migration steps if any for this database
 * @param {MigrationEvents} migrationEvents - The migrationEvent object housing all the callbacks for the migration status onSuccess, onFailure and onStarted.
 */
export const createSqliteAdaptorOptions = ({
    dbPath = '',
    migrationEvents = undefined,
    migrationSteps = undefined,
    schema = defaultSchema,
}: MMAdaptorOptions):SQLiteAdapterOptions => {
    return {
        schema,
        dbName: dbPath,
        ...(Boolean(migrationEvents) && {migrationEvents}),
        ...(Boolean(migrationSteps) && migrationSteps!.length > 0 && {migrations: schemaMigrations({migrations: migrationSteps!})}),
    };
};
