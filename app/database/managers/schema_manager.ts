// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SQLiteAdapterOptions} from '@nozbe/watermelondb/adapters/sqlite';
import {defaultSchema} from '../default/schema';
import {DB_NAME} from '@constants/database';
import {migrations as defaultMigration} from '../default/migration';
import {migrations as serverMigration} from '../server/migration';
import {schemaMigrations} from '@nozbe/watermelondb/Schema/migrations';
import {serverSchema} from '../server/schema';

export const default_schema_manager:SQLiteAdapterOptions = {
    dbName: DB_NAME.DEFAULT_DATABASE,
    schema: defaultSchema,
    ...(defaultMigration.length > 0 && {migrations: schemaMigrations({migrations: defaultMigration})}),
};

export const server_schema_manager:SQLiteAdapterOptions = {
    dbName: DB_NAME.SERVER_DATABASE,
    schema: serverSchema,
    ...(serverMigration.length > 0 && {migrations: schemaMigrations({migrations: serverMigration})}),
};
