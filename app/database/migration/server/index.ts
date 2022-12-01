// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// NOTE : To implement migration, please follow this document
// https://nozbe.github.io/WatermelonDB/Advanced/Migrations.html

import {schemaMigrations, addColumns, createTable} from '@nozbe/watermelondb/Schema/migrations';

import {MM_TABLES} from '@constants/database';
import {tableSchemaSpec as configSpec} from '@database/schema/server/table_schemas/config';
import {tableSchemaSpec as teamThreadsSyncSpec} from '@database/schema/server/table_schemas/team_threads_sync';
import {tableSchemaSpec as threadSpec} from '@database/schema/server/table_schemas/thread';
import {tableSchemaSpec as threadInTeamSpec} from '@database/schema/server/table_schemas/thread_in_team';
import {tableSchemaSpec as threadParticipantSpec} from '@database/schema/server/table_schemas/thread_participant';

const {SERVER: {
    GROUP,
    MY_CHANNEL,
    TEAM,
    THREAD,
    THREAD_PARTICIPANT,
    THREADS_IN_TEAM,
    USER,
}} = MM_TABLES;

export default schemaMigrations({migrations: [
    {
        toVersion: 6,
        steps: [

            // Along with adding the new table - TeamThreadsSync,
            // We need to clear the thread related tables (DROP & CREATE) to refetch the data
            createTable({
                ...teamThreadsSyncSpec,
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                unsafeSql: () => `
                    DROP TABLE ${THREAD};
                    DROP TABLE ${THREADS_IN_TEAM};
                    DROP TABLE ${THREAD_PARTICIPANT};
                `,
            }),
            createTable(threadSpec),
            createTable(threadInTeamSpec),
            createTable(threadParticipantSpec),

            addColumns({
                table: USER,
                columns: [
                    {name: 'terms_of_service_id', type: 'string'},
                    {name: 'terms_of_service_create_at', type: 'number'},
                ],
            }),
        ],
    },
    {
        toVersion: 5,
        steps: [
            createTable(configSpec),
        ],
    },
    {
        toVersion: 4,
        steps: [
            addColumns({
                table: TEAM,
                columns: [
                    {name: 'invite_id', type: 'string'},
                ],
            }),
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
