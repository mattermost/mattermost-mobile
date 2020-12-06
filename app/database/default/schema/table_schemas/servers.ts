// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

const {SERVERS} = MM_TABLES.DEFAULT;

export default tableSchema({
    name: SERVERS,
    columns: [
        {name: 'db_path', type: 'string'},
        {name: 'display_name', type: 'string'},
        {name: 'mention_count', type: 'number'},
        {name: 'unread_count', type: 'number'},
        {name: 'url', type: 'string', isIndexed: true},
    ],
});
