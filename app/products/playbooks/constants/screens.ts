// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export const PLAYBOOKS_RUNS = 'PlaybookRuns';
export const PARTICIPANT_PLAYBOOKS = 'ParticipantPlaybooks';
export const PLAYBOOK_RUN = 'PlaybookRun';
export const PLAYBOOK_EDIT_COMMAND = 'PlaybookEditCommand';
export const PLAYBOOK_POST_UPDATE = 'PlaybookPostUpdate';
export const PLAYBOOK_RENAME_CHECKLIST = 'PlaybookRenameChecklist';
export const PLAYBOOK_RENAME_RUN = 'PlaybookRenameRun';
export const PLAYBOOK_SELECT_USER = 'PlaybookSelectUser';
export const PLAYBOOKS_SELECT_DATE = 'PlaybooksSelectDate';
export const PLAYBOOKS_SELECT_PLAYBOOK = 'PlaybooksSelectPlaybook';
export const PLAYBOOKS_START_A_RUN = 'PlaybooksStartARun';

export default {
    PLAYBOOKS_RUNS,
    PARTICIPANT_PLAYBOOKS,
    PLAYBOOK_RUN,
    PLAYBOOK_EDIT_COMMAND,
    PLAYBOOK_POST_UPDATE,
    PLAYBOOK_RENAME_CHECKLIST,
    PLAYBOOK_RENAME_RUN,
    PLAYBOOK_SELECT_USER,
    PLAYBOOKS_SELECT_DATE,
    PLAYBOOKS_SELECT_PLAYBOOK,
    PLAYBOOKS_START_A_RUN,
} as const;
