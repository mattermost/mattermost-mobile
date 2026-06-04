// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

const {PROPERTY_VALUE} = MM_TABLES.SERVER;

export default tableSchema({
    name: PROPERTY_VALUE,
    columns: [
        {name: 'field_id', type: 'string', isIndexed: true},
        {name: 'target_id', type: 'string', isIndexed: true},
        {name: 'target_type', type: 'string'},
        {name: 'group_id', type: 'string'},
        {name: 'value', type: 'string'},
        {name: 'create_at', type: 'number'},
        {name: 'update_at', type: 'number'},
        {name: 'delete_at', type: 'number'},
        {name: 'created_by', type: 'string'},
        {name: 'updated_by', type: 'string'},
    ],
});
