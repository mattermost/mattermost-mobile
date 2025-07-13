// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {PLAYBOOK_TABLES} from '@playbooks/constants/database';

const {PLAYBOOK_RUN} = PLAYBOOK_TABLES;

export default tableSchema({
    name: PLAYBOOK_RUN,
    columns: [
        {name: 'playbook_id', type: 'string'},
        {name: 'name', type: 'string'},
        {name: 'description', type: 'string'},
        {name: 'is_active', type: 'boolean', isIndexed: true},
        {name: 'owner_user_id', type: 'string'},
        {name: 'team_id', type: 'string'},
        {name: 'channel_id', type: 'string', isIndexed: true},
        {name: 'post_id', type: 'string', isOptional: true},
        {name: 'create_at', type: 'number'},
        {name: 'end_at', type: 'number'},
        {name: 'active_stage', type: 'number'},
        {name: 'active_stage_title', type: 'string'},
        {name: 'participant_ids', type: 'string'}, // JSON string
        {name: 'summary', type: 'string'},
        {name: 'current_status', type: 'string', isIndexed: true},
        {name: 'last_status_update_at', type: 'number'},
        {name: 'retrospective_enabled', type: 'boolean'},
        {name: 'retrospective', type: 'string'},
        {name: 'retrospective_published_at', type: 'number'},
        {name: 'sync', type: 'string', isIndexed: true, isOptional: true},
        {name: 'last_sync_at', type: 'number', isOptional: true},
        {name: 'previous_reminder', type: 'number', isOptional: true},
        {name: 'items_order', type: 'string'}, // JSON string
        {name: 'update_at', type: 'number'},
    ],
});
