// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

const {CATEGORY_CHANNEL} = MM_TABLES.SERVER;

export default tableSchema({
    name: CATEGORY_CHANNEL,
    columns: [
        {name: 'category_id', type: 'string', isIndexed: true},
        {name: 'channel_id', type: 'string', isIndexed: true},
        {name: 'sort_order', type: 'number'},
    ],
});
