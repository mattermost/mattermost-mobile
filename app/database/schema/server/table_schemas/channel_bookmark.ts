// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

const {CHANNEL_BOOKMARK} = MM_TABLES.SERVER;

export default tableSchema({
    name: CHANNEL_BOOKMARK,
    columns: [
        {name: 'create_at', type: 'number'},
        {name: 'update_at', type: 'number'},
        {name: 'delete_at', type: 'number'},
        {name: 'channel_id', type: 'string', isIndexed: true},
        {name: 'owner_id', type: 'string'},
        {name: 'file_id', type: 'string', isOptional: true},
        {name: 'display_name', type: 'string'},
        {name: 'sort_order', type: 'number'},
        {name: 'link_url', type: 'string', isOptional: true},
        {name: 'image_url', type: 'string', isOptional: true},
        {name: 'emoji', type: 'string', isOptional: true},
        {name: 'type', type: 'string'},
        {name: 'original_id', type: 'string', isOptional: true},
        {name: 'parent_id', type: 'string', isOptional: true},
    ],
});
