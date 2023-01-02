// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

import type {TableSchemaSpec} from '@nozbe/watermelondb/Schema';

const {THREADS_IN_TEAM} = MM_TABLES.SERVER;

export const tableSchemaSpec: TableSchemaSpec = {
    name: THREADS_IN_TEAM,
    columns: [
        {name: 'team_id', type: 'string', isIndexed: true},
        {name: 'thread_id', type: 'string', isIndexed: true},
    ],
};

export default tableSchema(tableSchemaSpec);
