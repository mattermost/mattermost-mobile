// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

const {PREFERENCE} = MM_TABLES.SERVER;

export default tableSchema({
    name: PREFERENCE,
    columns: [
        {name: 'category', type: 'string', isIndexed: true},
        {name: 'name', type: 'string'},
        {name: 'user_id', type: 'string', isIndexed: true},
        {name: 'value', type: 'string'},
    ],
});
