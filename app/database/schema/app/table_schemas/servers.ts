// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

const {SERVERS} = MM_TABLES.APP;

export default tableSchema({
    name: SERVERS,
    columns: [
        {name: 'db_path', type: 'string'},
        {name: 'display_name', type: 'string'},
        {name: 'url', type: 'string', isIndexed: true},
        {name: 'last_active_at', type: 'number', isIndexed: true},
        {name: 'identifier', type: 'string', isIndexed: true},
    ],
});

