// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

const {CATEGORY} = MM_TABLES.SERVER;

export default tableSchema({
    name: CATEGORY,
    columns: [
        {name: 'team_id', type: 'string', isIndexed: true},
        {name: 'user_id', type: 'string', isIndexed: true},
        {name: 'type', type: 'string'},
        {name: 'display_name', type: 'string'},
    ],
});
