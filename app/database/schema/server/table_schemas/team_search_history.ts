// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

const {TEAM_SEARCH_HISTORY} = MM_TABLES.SERVER;

export default tableSchema({
    name: TEAM_SEARCH_HISTORY,
    columns: [
        {name: 'created_at', type: 'number'},
        {name: 'display_term', type: 'string'},
        {name: 'team_id', type: 'string', isIndexed: true},
        {name: 'term', type: 'string'},
    ],
});

