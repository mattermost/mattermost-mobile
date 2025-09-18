// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// NOTE : To implement migration, please follow this document
// https://nozbe.github.io/WatermelonDB/Advanced/Migrations.html

import {addColumns, createTable, schemaMigrations, unsafeExecuteSql} from '@nozbe/watermelondb/Schema/migrations';

import {MM_TABLES} from '@constants/database';
import {PLAYBOOK_TABLES} from '@playbooks/constants/database';

const {
    CHANNEL,
    CHANNEL_BOOKMARK,
    CHANNEL_INFO,
    CUSTOM_PROFILE_ATTRIBUTE,
    CUSTOM_PROFILE_FIELD,
    DRAFT,
    FILE,
    MY_CHANNEL,
    POST,
    SCHEDULED_POST,
} = MM_TABLES.SERVER;

const {PLAYBOOK_RUN, PLAYBOOK_CHECKLIST, PLAYBOOK_CHECKLIST_ITEM} = PLAYBOOK_TABLES;

export default schemaMigrations({migrations: [
    {
        toVersion: 13,
        steps: [
            addColumns({
                table: PLAYBOOK_CHECKLIST_ITEM,
                columns: [
                    {name: 'condition_action', type: 'string'},
                    {name: 'condition_reason', type: 'string'},
                ],
            }),
        ],
    },
    {
        toVersion: 12,
        steps: [
            createTable({
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
                    {name: 'previous_reminder', type: 'number'},
                    {name: 'items_order', type: 'string'},
                    {name: 'retrospective_enabled', type: 'boolean'},
                    {name: 'retrospective', type: 'string'},
                    {name: 'retrospective_published_at', type: 'number'},
                    {name: 'update_at', type: 'number'},
                    {name: 'sync', type: 'string', isIndexed: true, isOptional: true},
                    {name: 'last_sync_at', type: 'number', isOptional: true},
                ],
            }),
            createTable({
                name: PLAYBOOK_CHECKLIST,
                columns: [
                    {name: 'run_id', type: 'string', isIndexed: true},
                    {name: 'items_order', type: 'string'},
                    {name: 'title', type: 'string'},
                    {name: 'update_at', type: 'number'},
                    {name: 'sync', type: 'string', isIndexed: true, isOptional: true},
                    {name: 'last_sync_at', type: 'number', isOptional: true},
                ],
            }),
            createTable({
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
                    {name: 'update_at', type: 'number'},
                    {name: 'sync', type: 'string', isIndexed: true, isOptional: true},
                    {name: 'last_sync_at', type: 'number', isOptional: true},
                ],
            }),
            addColumns({
                table: MY_CHANNEL,
                columns: [
                    {name: 'last_playbook_runs_fetch_at', type: 'number'},
                ],
            }),
        ],
    },
    {
        toVersion: 11,
        steps: [
            addColumns({
                table: CHANNEL,
                columns: [
                    {name: 'abac_policy_enforced', type: 'boolean', isOptional: true},
                ],
            }),
        ],
    },
    {
        toVersion: 10,
        steps: [
            addColumns({
                table: FILE,
                columns: [
                    {name: 'is_blocked', type: 'boolean'},
                ],
            }),
        ],
    },
    {
        toVersion: 9,
        steps: [
            createTable({
                name: SCHEDULED_POST,
                columns: [
                    {name: 'channel_id', type: 'string', isIndexed: true},
                    {name: 'message', type: 'string'},
                    {name: 'files', type: 'string'},
                    {name: 'root_id', type: 'string', isIndexed: true},
                    {name: 'metadata', type: 'string', isOptional: true},
                    {name: 'create_at', type: 'number'},
                    {name: 'update_at', type: 'number'},
                    {name: 'scheduled_at', type: 'number'},
                    {name: 'processed_at', type: 'number'},
                    {name: 'error_code', type: 'string'},
                ],
            }),
        ],
    },
    {
        toVersion: 8,
        steps: [
            createTable({
                name: CUSTOM_PROFILE_ATTRIBUTE,
                columns: [
                    {name: 'field_id', type: 'string', isIndexed: true},
                    {name: 'user_id', type: 'string', isIndexed: true},
                    {name: 'value', type: 'string'},
                ],
            }),
            createTable({
                name: CUSTOM_PROFILE_FIELD,
                columns: [
                    {name: 'group_id', type: 'string', isIndexed: true},
                    {name: 'name', type: 'string'},
                    {name: 'type', type: 'string'},
                    {name: 'target_id', type: 'string'},
                    {name: 'target_type', type: 'string'},
                    {name: 'create_at', type: 'number'},
                    {name: 'update_at', type: 'number'},
                    {name: 'delete_at', type: 'number', isOptional: true},
                    {name: 'attrs', type: 'string', isOptional: true},
                ],
            }),
        ],
    },
    {
        toVersion: 7,
        steps: [
            addColumns({
                table: CHANNEL,
                columns: [
                    {name: 'banner_info', type: 'string', isOptional: true},
                ],
            }),
        ],
    },
    {
        toVersion: 6,
        steps: [
            unsafeExecuteSql('CREATE INDEX IF NOT EXISTS Post_type ON Post (type);'),
        ],
    },
    {
        toVersion: 5,
        steps: [
            addColumns({
                table: DRAFT,
                columns: [
                    {name: 'update_at', type: 'number'},
                ],
            }),
        ],
    },
    {
        toVersion: 4,
        steps: [
            createTable({
                name: CHANNEL_BOOKMARK,
                columns: [
                    {name: 'create_at', type: 'number'},
                    {name: 'update_at', type: 'number'},
                    {name: 'delete_at', type: 'number'},
                    {name: 'channel_id', type: 'string', isIndexed: true},
                    {name: 'owner_id', type: 'string'},
                    {name: 'file_id', type: 'string', isOptional: true},
                    {name: 'display_name', type: 'string'},
                    {name: 'sort_order', type: 'number'},
                    {name: 'link_url', type: 'string', isOptional: true},
                    {name: 'image_url', type: 'string', isOptional: true},
                    {name: 'emoji', type: 'string', isOptional: true},
                    {name: 'type', type: 'string'},
                    {name: 'original_id', type: 'string', isOptional: true},
                    {name: 'parent_id', type: 'string', isOptional: true},
                ],
            }),
        ],
    },
    {
        toVersion: 3,
        steps: [
            addColumns({
                table: POST,
                columns: [
                    {name: 'message_source', type: 'string'},
                ],
            }),
        ],
    },
    {
        toVersion: 2,
        steps: [
            addColumns({
                table: CHANNEL_INFO,
                columns: [
                    {name: 'files_count', type: 'number'},
                ],
            }),
            addColumns({
                table: DRAFT,
                columns: [
                    {name: 'metadata', type: 'string', isOptional: true},
                ],
            }),
        ],
    },
]});
