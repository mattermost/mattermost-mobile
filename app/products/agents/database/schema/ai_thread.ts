// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AGENTS_TABLES} from '@agents/constants/database';
import {tableSchema} from '@nozbe/watermelondb';

const {AI_THREAD} = AGENTS_TABLES;

export default tableSchema({
    name: AI_THREAD,
    columns: [
        {name: 'message', type: 'string'},
        {name: 'title', type: 'string'},
        {name: 'channel_id', type: 'string', isIndexed: true},
        {name: 'reply_count', type: 'number'},
        {name: 'update_at', type: 'number', isIndexed: true},
    ],
});
