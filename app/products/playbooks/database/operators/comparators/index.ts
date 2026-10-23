// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type PlaybookChecklistModel from '@playbooks/types/database/models/playbook_checklist';
import type PlaybookChecklistItemModel from '@playbooks/types/database/models/playbook_checklist_item';
import type PlaybookRunModel from '@playbooks/types/database/models/playbook_run';

export const shouldUpdatePlaybookRunRecord = (existingRecord: PlaybookRunModel, raw: PartialPlaybookRun): boolean => {
    return Boolean(existingRecord.updateAt !== raw.update_at || raw.task_activity_sync || 'timeline_events_synced_at' in raw || 'task_activity_clear_certificate' in raw);
};

export const shouldHandlePlaybookChecklistRecord = (existingRecord: PlaybookChecklistModel, raw: PartialChecklist): boolean => {
    return Boolean(existingRecord.updateAt !== raw.update_at);
};

export const shouldHandlePlaybookChecklistItemRecord = (existingRecord: PlaybookChecklistItemModel, raw: PartialChecklistItem): boolean => {
    return Boolean(existingRecord.updateAt !== raw.update_at || (raw && 'state_event_id' in raw && (!existingRecord.stateEventLinkKnown || existingRecord.stateEventId !== raw.state_event_id)));
};
