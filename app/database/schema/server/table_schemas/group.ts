// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

const {GROUP} = MM_TABLES.SERVER;

export default tableSchema({
    name: GROUP,
    columns: [
        {name: 'display_name', type: 'string'},
        {name: 'name', type: 'string', isIndexed: true},
        {name: 'description', type: 'string'},
        {name: 'source', type: 'string'},
        {name: 'remote_id', type: 'string', isIndexed: true},
        {name: 'created_at', type: 'number'},
        {name: 'updated_at', type: 'number'},
        {name: 'deleted_at', type: 'number'},
        {name: 'member_count', type: 'number'},
    ],
});
