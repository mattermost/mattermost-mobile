// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

const {ROLE} = MM_TABLES.SERVER;

export default tableSchema({
    name: ROLE,
    columns: [
        {name: 'name', type: 'string', isIndexed: true},
        {name: 'permissions', type: 'string'},
    ],
});
