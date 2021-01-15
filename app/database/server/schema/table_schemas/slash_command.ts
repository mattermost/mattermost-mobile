// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

const {SLASH_COMMAND} = MM_TABLES.SERVER;

export default tableSchema({
    name: SLASH_COMMAND,
    columns: [
        {name: 'is_auto_complete', type: 'boolean'},
        {name: 'description', type: 'string'},
        {name: 'display_name', type: 'string'},
        {name: 'hint', type: 'string'},
        {name: 'method', type: 'string'},
        {name: 'team_id', type: 'string', isIndexed: true},
        {name: 'token', type: 'string'},
        {name: 'trigger', type: 'string'},
    ],
});
