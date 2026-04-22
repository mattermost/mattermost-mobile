// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

const {VIEW} = MM_TABLES.SERVER;

export default tableSchema({
    name: VIEW,
    columns: [
        {name: 'channel_id', type: 'string', isIndexed: true},
        {name: 'type', type: 'string'},
        {name: 'creator_id', type: 'string'},
        {name: 'title', type: 'string'},
        {name: 'description', type: 'string', isOptional: true},
        {name: 'sort_order', type: 'number'},
        {name: 'props', type: 'string', isOptional: true},
        {name: 'create_at', type: 'number'},
        {name: 'update_at', type: 'number', isIndexed: true},
        {name: 'delete_at', type: 'number'},
    ],
});
