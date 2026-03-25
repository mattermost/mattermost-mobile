// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AGENTS_TABLES} from '@agents/constants/database';
import {tableSchema} from '@nozbe/watermelondb';

const {AI_BOT} = AGENTS_TABLES;

export default tableSchema({
    name: AI_BOT,
    columns: [
        {name: 'display_name', type: 'string'},
        {name: 'username', type: 'string'},
        {name: 'last_icon_update', type: 'number'},
        {name: 'dm_channel_id', type: 'string', isIndexed: true},
        {name: 'channel_access_level', type: 'number'},
        {name: 'channel_ids', type: 'string'}, // JSON string array
        {name: 'user_access_level', type: 'number'},
        {name: 'user_ids', type: 'string'}, // JSON string array
        {name: 'team_ids', type: 'string'}, // JSON string array
    ],
});
