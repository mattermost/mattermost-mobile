// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

import type {TableSchemaSpec} from '@nozbe/watermelondb/Schema';

const {CONFIG} = MM_TABLES.SERVER;

export const tableSchemaSpec: TableSchemaSpec = {
    name: CONFIG,
    columns: [
        {name: 'value', type: 'string'},
    ],
};

export default tableSchema(tableSchemaSpec);
