// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

const {MY_CHANNEL} = MM_TABLES.SERVER;

export default tableSchema({
    name: MY_CHANNEL,
    columns: [
        {name: 'is_unread', type: 'boolean'},
        {name: 'last_post_at', type: 'number'},
        {name: 'last_viewed_at', type: 'number'},
        {name: 'manually_unread', type: 'boolean'},
        {name: 'mentions_count', type: 'number'},
        {name: 'message_count', type: 'number'},
        {name: 'roles', type: 'string'},
        {name: 'viewed_at', type: 'number'},
        {name: 'last_fetched_at', type: 'number', isIndexed: true},
        {name: 'last_playbook_runs_fetch_at', type: 'number'},
    ],
});

