// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

import type {TableSchemaSpec} from '@nozbe/watermelondb/Schema';

const {TEAM_THREADS_SYNC} = MM_TABLES.SERVER;

export const tableSchemaSpec: TableSchemaSpec = {
    name: TEAM_THREADS_SYNC,
    columns: [
        {name: 'earliest', type: 'number'},
        {name: 'latest', type: 'number'},
    ],
};

export default tableSchema(tableSchemaSpec);
