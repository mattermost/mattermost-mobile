// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// db connection for default
// db connection for server

import DatabaseManager from './database_manager';
import App from '../default/models/app';
import Global from '../default/models/global';
import Server from '../default/models/server';
import {createSqliteAdaptorOptions} from './schema_manager';
import {defaultSchema} from '../default/schema';

// FIXME : to replace every dbPath with the AppGroup path

export const defaultDatabase = DatabaseManager.createDatabaseConnection({
    actionsEnabled: true,
    modelClasses: [App, Global, Server],
    adapter: createSqliteAdaptorOptions({
        dbPath: 'default_database',
        schema: defaultSchema,
    }),
});

export const serverDatabase = DatabaseManager.createDatabaseConnection({
    actionsEnabled: true,
    modelClasses: [App, Global, Server],
    adapter: createSqliteAdaptorOptions({
        dbPath: 'server_database',
        schema: defaultSchema,
    }),
});
