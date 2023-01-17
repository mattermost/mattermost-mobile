// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

import type {TableSchemaSpec} from '@nozbe/watermelondb/Schema';

const {THREAD_PARTICIPANT} = MM_TABLES.SERVER;

export const tableSchemaSpec: TableSchemaSpec = {
    name: THREAD_PARTICIPANT,
    columns: [
        {name: 'thread_id', type: 'string', isIndexed: true},
        {name: 'user_id', type: 'string', isIndexed: true},
    ],
};

export default tableSchema(tableSchemaSpec);
