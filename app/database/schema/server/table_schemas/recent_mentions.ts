// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

const {RECENT_MENTIONS} = MM_TABLES.SERVER;

export default tableSchema({
    name: RECENT_MENTIONS,
    columns: [
        {name: 'update_at', type: 'number'},
        {name: 'post_id', type: 'string', isIndexed: true},
    ],
});
