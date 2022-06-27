// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// NOTE : To implement migration, please follow this document
// https://nozbe.github.io/WatermelonDB/Advanced/Migrations.html

import {schemaMigrations, addColumns} from '@nozbe/watermelondb/Schema/migrations';

import {MM_TABLES} from '@constants/database';

const {SERVER: {
    MY_CHANNEL,
    THREAD,
}} = MM_TABLES;

export default schemaMigrations({migrations: [
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
