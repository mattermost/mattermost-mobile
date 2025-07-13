// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type PlaybookRunCreatedPayload = {
    playbook_run: PlaybookRun;
}

type PlaybookRunUpdate = {
    id: string;
    playbook_run_updated_at: number;
    changed_fields: Omit<Partial<PlaybookRun>, 'checklists'> & {
        checklists?: PlaybookChecklistUpdate[];
    };
}

type PlaybookChecklistUpdatePayload = {
    playbook_run_id: string;
    update: PlaybookChecklistUpdate;
}
type PlaybookChecklistUpdate = {
    id: string;
    index: number;
    checklist_updated_at: number;
    items_order?: string[];
    fields?: Omit<Partial<PlaybookChecklist>, 'items'> & {
        items?: PlaybookChecklistItemUpdate[];
    };
    item_updates?: ChecklistItemUpdate[];
    item_deletes?: string[];
    item_inserts?: PlaybookChecklistItem[];
}

type PlaybookChecklistItemUpdatePayload = {
    playbook_run_id: string;
    checklist_id: string;
    update: PlaybookChecklistItemUpdate;
}

type PlaybookChecklistItemUpdate = {
    id: string;
    index: number;
    checklist_item_updated_at: number;
    fields: Partial<PlaybookChecklistItem>;
}
