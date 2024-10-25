// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

const {POST} = MM_TABLES.SERVER;

export default tableSchema({
    name: POST,
    columns: [
        {name: 'channel_id', type: 'string', isIndexed: true},
        {name: 'create_at', type: 'number'},
        {name: 'delete_at', type: 'number'},
        {name: 'edit_at', type: 'number'},
        {name: 'is_pinned', type: 'boolean'},
        {name: 'message', type: 'string'},
        {name: 'message_source', type: 'string'},
        {name: 'metadata', type: 'string', isOptional: true},
        {name: 'original_id', type: 'string'},
        {name: 'pending_post_id', type: 'string', isIndexed: true},
        {name: 'previous_post_id', type: 'string'},
        {name: 'props', type: 'string'},
        {name: 'root_id', type: 'string'},
        {name: 'type', type: 'string', isIndexed: true},
        {name: 'update_at', type: 'number'},
        {name: 'user_id', type: 'string', isIndexed: true},
    ],
});

