// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const PLAYBOOKS_RUNS = 'playbook_runs';
const PARTICIPANT_PLAYBOOKS = 'participant_playbooks';
const PLAYBOOK_RUN = 'playbook_run';
const PLAYBOOK_EDIT_COMMAND = 'playbook_edit_command';
const PLAYBOOK_POST_UPDATE = 'playbook_post_update';
const PLAYBOOK_RENAME_CHECKLIST = 'playbook_rename_checklist';
const PLAYBOOK_ADD_CHECKLIST_ITEM = 'playbook_add_checklist_item';
const PLAYBOOK_RENAME_RUN = 'playbook_rename_run';
const PLAYBOOK_SELECT_USER = 'playbook_select_user';
const PLAYBOOKS_SELECT_DATE = 'playbooks_select_date';
const PLAYBOOKS_SELECT_PLAYBOOK = 'playbooks_select_playbook';
const PLAYBOOKS_START_A_RUN = 'playbooks_start_a_run';
const PLAYBOOKS_CREATE_QUICK_CHECKLIST = 'playbooks_create_quick_checklist';

export default {
    PLAYBOOKS_RUNS,
    PARTICIPANT_PLAYBOOKS,
    PLAYBOOK_RUN,
    PLAYBOOK_EDIT_COMMAND,
    PLAYBOOK_POST_UPDATE,
    PLAYBOOK_RENAME_CHECKLIST,
    PLAYBOOK_ADD_CHECKLIST_ITEM,
    PLAYBOOK_RENAME_RUN,
    PLAYBOOK_SELECT_USER,
    PLAYBOOKS_SELECT_DATE,
    PLAYBOOKS_SELECT_PLAYBOOK,
    PLAYBOOKS_START_A_RUN,
    PLAYBOOKS_CREATE_QUICK_CHECKLIST,
} as const;
