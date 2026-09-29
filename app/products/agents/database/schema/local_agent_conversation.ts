// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {AGENTS_TABLES} from '@agents/constants/database';

const {LOCAL_AGENT_CONVERSATION} = AGENTS_TABLES;

export default tableSchema({
    name: LOCAL_AGENT_CONVERSATION,
    columns: [
        {name: 'title', type: 'string'},
        {name: 'create_at', type: 'number'},
        {name: 'update_at', type: 'number', isIndexed: true},
    ],
});
