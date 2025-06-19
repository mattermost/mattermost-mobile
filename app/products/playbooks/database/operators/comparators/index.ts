// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type PlaybookChecklistModel from '@playbooks/types/database/models/playbook_checklist';
import type PlaybookChecklistItemModel from '@playbooks/types/database/models/playbook_checklist_item';
import type PlaybookRunModel from '@playbooks/types/database/models/playbook_run';

export const shouldUpdatePlaybookRunRecord = (existingRecord: PlaybookRunModel, raw: PlaybookRun): boolean => {
    return Boolean(existingRecord.lastStatusUpdateAt !== raw.last_status_update_at ||
        existingRecord.endAt !== raw.end_at ||
        existingRecord.activeStage !== raw.active_stage ||
        existingRecord.isActive !== raw.is_active ||
        existingRecord.currentStatus !== raw.current_status ||
        existingRecord.retrospectiveEnabled !== raw.retrospective_enabled ||
        existingRecord.retrospectivePublishedAt !== raw.retrospective_published_at ||
        existingRecord.participantIds.length !== raw.participant_ids.length ||
        !existingRecord.participantIds.every((id, index) => id === raw.participant_ids[index]) ||
        existingRecord.updateAt !== raw.update_at);
};

export const shouldHandlePlaybookChecklistRecord = (existingRecord: PlaybookChecklistModel, raw: PlaybookChecklistWithRun): boolean => {
    return Boolean(existingRecord.title !== raw.title ||
        existingRecord.updateAt !== raw.update_at);
};

export const shouldHandlePlaybookChecklistItemRecord = (existingRecord: PlaybookChecklistItemModel, raw: PlaybookChecklistItemWithChecklist): boolean => {
    return Boolean(existingRecord.title !== raw.title ||
        existingRecord.description !== raw.description ||
        existingRecord.state !== raw.state ||
        existingRecord.assigneeId !== raw.assignee_id ||
        existingRecord.command !== raw.command ||
        existingRecord.dueDate !== raw.due_date ||
        existingRecord.taskActions?.length !== raw.task_actions?.length ||
        existingRecord.updateAt !== raw.update_at);
};
