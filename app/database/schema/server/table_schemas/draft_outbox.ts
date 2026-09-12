// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

const {DRAFT_OUTBOX} = MM_TABLES.SERVER;

export default tableSchema({
    name: DRAFT_OUTBOX,
    columns: [
        {name: 'channel_id', type: 'string', isIndexed: true},
        {name: 'root_id', type: 'string', isIndexed: true},
        {name: 'team_id', type: 'string', isIndexed: true},
        {name: 'operation', type: 'string'},
        {name: 'generation', type: 'number'},
        {name: 'keep_local', type: 'boolean'},
        {name: 'attempt_count', type: 'number'},
        {name: 'next_attempt_at', type: 'number'},
        {name: 'status', type: 'string'},
        {name: 'last_error_code', type: 'string', isOptional: true},
        {name: 'deleted_fingerprint', type: 'string', isOptional: true},
    ],
});
