// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {PLAYBOOK_TABLES} from '@playbooks/constants/database';

const {PLAYBOOK_CHECKLIST} = PLAYBOOK_TABLES;

export default tableSchema({
    name: PLAYBOOK_CHECKLIST,
    columns: [
        {name: 'run_id', type: 'string', isIndexed: true},
        {name: 'title', type: 'string'},
        {name: 'sync', type: 'string', isIndexed: true, isOptional: true},
        {name: 'last_sync_at', type: 'number', isOptional: true},
        {name: 'items_order', type: 'string'}, // JSON string
        {name: 'update_at', type: 'number'},
    ],
});
