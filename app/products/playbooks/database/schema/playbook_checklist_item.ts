// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {PLAYBOOK_TABLES} from '@playbooks/constants/database';

const {PLAYBOOK_CHECKLIST_ITEM} = PLAYBOOK_TABLES;

export default tableSchema({
    name: PLAYBOOK_CHECKLIST_ITEM,
    columns: [
        {name: 'checklist_id', type: 'string', isIndexed: true},
        {name: 'title', type: 'string'},
        {name: 'state', type: 'string', isIndexed: true},
        {name: 'state_modified', type: 'number'},
        {name: 'assignee_id', type: 'string', isOptional: true},
        {name: 'assignee_modified', type: 'number'},
        {name: 'command', type: 'string', isOptional: true},
        {name: 'command_last_run', type: 'number'},
        {name: 'description', type: 'string'},
        {name: 'due_date', type: 'number'},
        {name: 'completed_at', type: 'number'},
        {name: 'task_actions', type: 'string', isOptional: true}, // JSON string
        {name: 'sync', type: 'string', isIndexed: true, isOptional: true},
        {name: 'last_sync_at', type: 'number', isOptional: true},
        {name: 'update_at', type: 'number'},
    ],
});
