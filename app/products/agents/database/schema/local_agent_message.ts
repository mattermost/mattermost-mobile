// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {AGENTS_TABLES} from '@agents/constants/database';

const {LOCAL_AGENT_MESSAGE} = AGENTS_TABLES;

export default tableSchema({
    name: LOCAL_AGENT_MESSAGE,
    columns: [
        {name: 'conversation_id', type: 'string', isIndexed: true},
        {name: 'role', type: 'string'},
        {name: 'message', type: 'string'},
        {name: 'reasoning', type: 'string', isOptional: true},
        {name: 'tool_calls', type: 'string', isOptional: true},
        {name: 'status', type: 'string'},
        {name: 'create_at', type: 'number'},
    ],
});
