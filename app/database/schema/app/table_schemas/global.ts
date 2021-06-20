// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

const {GLOBAL} = MM_TABLES.APP;

export default tableSchema({
    name: GLOBAL,
    columns: [
        {name: 'name', type: 'string', isIndexed: true},
        {name: 'value', type: 'string'},
    ],
});
