// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {schemaMigrations, addColumns} from '@nozbe/watermelondb/Schema/migrations';

import {MM_TABLES} from '@constants/database';

const {SERVERS} = MM_TABLES.APP;

// NOTE : To implement migration, please follow this document
// https://nozbe.github.io/WatermelonDB/Advanced/Migrations.html

export default schemaMigrations({
    migrations: [
        {
            toVersion: 2,
            steps: [
                addColumns({
                    table: SERVERS,
                    columns: [
                        {name: 'shared_password_key', type: 'string'},
                    ],
                }),
            ],
        },
    ],
});
