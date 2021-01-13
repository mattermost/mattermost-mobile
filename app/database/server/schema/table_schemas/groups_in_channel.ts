// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

const {GROUPS_IN_CHANNEL} = MM_TABLES.SERVER;

export default tableSchema({
    name: GROUPS_IN_CHANNEL,
    columns: [
        {name: 'channel_id', type: 'string', isIndexed: true},
        {name: 'group_id', type: 'string', isIndexed: true},
        {name: 'member_count', type: 'number'},
        {name: 'timezone_count', type: 'number'},
    ],
});
