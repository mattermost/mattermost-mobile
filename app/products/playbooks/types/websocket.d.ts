// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type PlaybookRunUpdate = {
    id: string;
    updated_at: number;
    changed_fields: Partial<PlaybookRun>;
}

type PlaybookChecklistUpdate = {
    playbook_run_id: string;
    update: {
        id: string;
        index: number;
        updated_at: number;
        fields?: Partial<PlaybookChecklist>;
        item_updates?: ChecklistItemUpdate[];
        item_deletes?: string[];
        item_inserts?: PlaybookChecklistItem[];
    };
}

type PlaybookChecklistItemUpdate = {
    playbook_run_id: string;
    checklist_id: string;
    update: {
        id: string;
        index: number;
        updated_at: number;
        fields: Partial<PlaybookChecklistItem>;
    };
}
