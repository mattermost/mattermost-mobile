// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

const {DRAFT} = MM_TABLES.SERVER;

export default tableSchema({
    name: DRAFT,
    columns: [
        {name: 'channel_id', type: 'string', isIndexed: true},
        {name: 'files', type: 'string'},
        {name: 'message', type: 'string'},
        {name: 'root_id', type: 'string', isIndexed: true},
        {name: 'metadata', type: 'string', isOptional: true},
        {name: 'update_at', type: 'number'},
    ],
});
