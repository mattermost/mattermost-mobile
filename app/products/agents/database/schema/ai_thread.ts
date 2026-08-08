// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {AGENTS_TABLES} from '@agents/constants/database';

const {AI_THREAD} = AGENTS_TABLES;

export default tableSchema({
    name: AI_THREAD,

    // The 2.0 history DTO dropped the message preview and reply_count;
    // migrated installs keep orphaned sqlite columns which WatermelonDB ignores.
    columns: [
        {name: 'title', type: 'string'},
        {name: 'channel_id', type: 'string', isIndexed: true},
        {name: 'turn_count', type: 'number'},
        {name: 'update_at', type: 'number', isIndexed: true},
    ],
});
