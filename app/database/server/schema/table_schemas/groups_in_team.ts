// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

const {GROUPS_IN_TEAM} = MM_TABLES.SERVER;

export default tableSchema({
    name: GROUPS_IN_TEAM,
    columns: [
        {name: 'group_id', type: 'string', isIndexed: true},
        {name: 'member_count', type: 'number'},
        {name: 'team_id', type: 'string', isIndexed: true},
        {name: 'timezone_count', type: 'number'},
    ],
});
