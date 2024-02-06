// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// NOTE : To implement migration, please follow this document
// https://nozbe.github.io/WatermelonDB/Advanced/Migrations.html

import {addColumns, schemaMigrations} from '@nozbe/watermelondb/Schema/migrations';

import {MM_TABLES} from '@constants/database';

const {CHANNEL_INFO, DRAFT, POST} = MM_TABLES.SERVER;

export default schemaMigrations({migrations: [
    {
        toVersion: 3,
        steps: [
            addColumns({
                table: POST,
                columns: [
                    {name: 'message_source', type: 'string'},
                ],
            }),
        ],
    },
    {
        toVersion: 2,
        steps: [
            addColumns({
                table: CHANNEL_INFO,
                columns: [
                    {name: 'files_count', type: 'number'},
                ],
            }),
            addColumns({
                table: DRAFT,
                columns: [
                    {name: 'metadata', type: 'string', isOptional: true},
                ],
            }),
        ],
    },
]});
