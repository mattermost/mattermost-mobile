// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

const {REACTION} = MM_TABLES.SERVER;

export default tableSchema({
    name: REACTION,
    columns: [
        {name: 'create_at', type: 'number'},
        {name: 'emoji_name', type: 'string'},
        {name: 'post_id', type: 'string', isIndexed: true},
        {name: 'user_id', type: 'string', isIndexed: true},
    ],
});

