// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

const {THREAD_PARTICIPANT} = MM_TABLES.SERVER;

export default tableSchema({
    name: THREAD_PARTICIPANT,
    columns: [
        {name: 'thread_id', type: 'string', isIndexed: true},
        {name: 'user_id', type: 'string', isIndexed: true},
    ],
});
