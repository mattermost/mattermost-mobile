// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

const {THREAD} = MM_TABLES.SERVER;

export default tableSchema({
    name: THREAD,
    columns: [
        {name: 'last_reply_at', type: 'number'},
        {name: 'last_viewed_at', type: 'number'},
        {name: 'is_following', type: 'boolean'},
        {name: 'reply_count', type: 'number'},
        {name: 'unread_replies', type: 'number'},
        {name: 'unread_mentions', type: 'number'},
        {name: 'loaded_in_global_threads', type: 'boolean'},
    ],
});
