// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

const {PROPERTY_FIELD} = MM_TABLES.SERVER;

export default tableSchema({
    name: PROPERTY_FIELD,
    columns: [
        {name: 'group_id', type: 'string'},
        {name: 'name', type: 'string'},
        {name: 'type', type: 'string'},
        {name: 'attrs', type: 'string', isOptional: true},
        {name: 'object_type', type: 'string'},
        {name: 'target_id', type: 'string', isIndexed: true},
        {name: 'target_type', type: 'string'},
        {name: 'protected', type: 'boolean'},
        {name: 'permission_field', type: 'string', isOptional: true},
        {name: 'permission_values', type: 'string', isOptional: true},
        {name: 'permission_options', type: 'string', isOptional: true},
        {name: 'create_at', type: 'number'},
        {name: 'update_at', type: 'number', isIndexed: true},
        {name: 'delete_at', type: 'number'},
        {name: 'created_by', type: 'string'},
        {name: 'updated_by', type: 'string'},
    ],
});
