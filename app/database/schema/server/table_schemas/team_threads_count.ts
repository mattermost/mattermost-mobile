// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

const {TEAM_THREADS_COUNT} = MM_TABLES.SERVER;

export default tableSchema({
    name: TEAM_THREADS_COUNT,
    columns: [
        {name: 'total', type: 'number'},
        {name: 'total_unread_mentions', type: 'number'},
        {name: 'total_unread_threads', type: 'number'},
    ],
});
