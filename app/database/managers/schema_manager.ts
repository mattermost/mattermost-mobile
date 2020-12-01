// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SQLiteAdapterOptions} from '@nozbe/watermelondb/adapters/sqlite';
import {AppSchema} from '@nozbe/watermelondb';
import {Migration, schemaMigrations} from '@nozbe/watermelondb/Schema/migrations';

/**
 * Creates an adapter options object that will be used by the database manager.
 * @param {string} dbPath - The dbName or filePath (e.g. AppGroup path) for the database
 * @param {AppSchema} schema - The schema to be used for this connection
 * @param {Migration} migrationSteps - The migration steps if any for this database
 */
// TODO : add callbacks for events 'started, success, error'
export const create_schema_manager = (dbPath: string, schema: AppSchema, migrationSteps: Migration []):SQLiteAdapterOptions => {
    return {
        schema,
        dbName: dbPath,
        ...(migrationSteps.length > 0 && {migrations: schemaMigrations({migrations: migrationSteps})}),
    };
};
