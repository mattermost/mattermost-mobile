// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {addColumns, schemaMigrations} from '@nozbe/watermelondb/Schema/migrations';

import {MM_TABLES} from '@constants/database';

// NOTE : To implement migration, please follow this document
// https://nozbe.github.io/WatermelonDB/Advanced/Migrations.html

const {SERVERS} = MM_TABLES.APP;

export default schemaMigrations({migrations: [
    {
        toVersion: 2,
        steps: [
            addColumns({
                table: SERVERS,
                columns: [
                    {name: 'persistence_flag', type: 'string'},
                ],
            }),
        ],
    },
]});
