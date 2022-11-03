// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// NOTE : To implement migration, please follow this document
// https://nozbe.github.io/WatermelonDB/Advanced/Migrations.html

import {schemaMigrations, addColumns, createTable} from '@nozbe/watermelondb/Schema/migrations';

import {tableSchemaSpec as configSpec} from '@app/database/schema/server/table_schemas/config';
import {MM_TABLES} from '@constants/database';

const {SERVER: {
    GROUP,
    MY_CHANNEL,
    THREAD,
}} = MM_TABLES;

export default schemaMigrations({migrations: [
    {
        toVersion: 4,
        steps: [
            createTable(configSpec),
        ],
    },
    {
        toVersion: 3,
        steps: [
            addColumns({
                table: GROUP,
                columns: [
                    {name: 'member_count', type: 'number'},
                ],
            }),
        ],
    },
    {
        toVersion: 2,
        steps: [
            addColumns({
                table: MY_CHANNEL,
                columns: [
                    {name: 'last_fetched_at', type: 'number', isIndexed: true},
                ],
            }),
            addColumns({
                table: THREAD,
                columns: [
                    {name: 'last_fetched_at', type: 'number', isIndexed: true},
                ],
            }),
        ],
    },
]});
