// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

const {CUSTOM_PROFILE_FIELD} = MM_TABLES.SERVER;

export default tableSchema({
    name: CUSTOM_PROFILE_FIELD,
    columns: [
        {name: 'group_id', type: 'string'},
        {name: 'name', type: 'string'},
        {name: 'type', type: 'string'},
        {name: 'target_id', type: 'string'},
        {name: 'target_type', type: 'string'},
        {name: 'create_at', type: 'number'},
        {name: 'update_at', type: 'number'},
        {name: 'delete_at', type: 'number'},
        {name: 'attrs', type: 'string', isOptional: true},
    ],
});
