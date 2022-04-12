// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

const {POSTS_IN_THREAD} = MM_TABLES.SERVER;

export default tableSchema({
    name: POSTS_IN_THREAD,
    columns: [
        {name: 'earliest', type: 'number'},
        {name: 'latest', type: 'number'},
        {name: 'root_id', type: 'string', isIndexed: true},
    ],
});
