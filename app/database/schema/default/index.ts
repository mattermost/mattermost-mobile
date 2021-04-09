// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppSchema, appSchema, tableSchema} from '@nozbe/watermelondb';
import {MM_TABLES} from '@constants/database';

const {APP, GLOBAL, SERVERS} = MM_TABLES.DEFAULT;

export const defaultSchema: AppSchema = appSchema({
    version: 1,
    tables: [
        tableSchema({
            name: APP,
            columns: [
                {name: 'build_number', type: 'string'},
                {name: 'created_at', type: 'number'},
                {name: 'version_number', type: 'string'},
            ],
        }),
        tableSchema({
            name: GLOBAL,
            columns: [
                {name: 'name', type: 'string', isIndexed: true},
                {name: 'value', type: 'string'},
            ],
        }),
        tableSchema({
            name: SERVERS,
            columns: [
                {name: 'db_path', type: 'string'},
                {name: 'display_name', type: 'string'},
                {name: 'mention_count', type: 'number'},
                {name: 'unread_count', type: 'number'},
                {name: 'url', type: 'string', isIndexed: true},
            ],
        }),
    ],
});
