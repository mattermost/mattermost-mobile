// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

const {SCHEDULED_POST} = MM_TABLES.SERVER;

export default tableSchema({
    name: SCHEDULED_POST,
    columns: [
        {name: 'channel_id', type: 'string', isIndexed: true},
        {name: 'files', type: 'string'},
        {name: 'message', type: 'string'},
        {name: 'root_id', type: 'string', isIndexed: true},
        {name: 'metadata', type: 'string', isOptional: true},
        {name: 'create_at', type: 'number'},
        {name: 'update_at', type: 'number'},
        {name: 'scheduled_at', type: 'number'},
        {name: 'processed_at', type: 'number'},
        {name: 'error_code', type: 'string'},
    ],
});
