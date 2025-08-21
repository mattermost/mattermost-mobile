// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {type AppSchema, appSchema, tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

const {INFO, GLOBAL, SERVERS} = MM_TABLES.APP;

export const schema: AppSchema = appSchema({
    version: 1,
    tables: [
        tableSchema({
            name: INFO,
            columns: [
                {name: 'build_number', type: 'string'},
                {name: 'created_at', type: 'number'},
                {name: 'version_number', type: 'string'},
            ],
        }),
        tableSchema({
            name: GLOBAL,
            columns: [
                {name: 'value', type: 'string'},
            ],
        }),
        tableSchema({
            name: SERVERS,
            columns: [
                {name: 'db_path', type: 'string'},
                {name: 'display_name', type: 'string'},
                {name: 'identifier', type: 'string', isIndexed: true},
                {name: 'last_active_at', type: 'number', isIndexed: true},
                {name: 'url', type: 'string', isIndexed: true},
            ],
        }),
    ],
});
