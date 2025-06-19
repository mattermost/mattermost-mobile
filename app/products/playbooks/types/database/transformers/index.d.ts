// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type PlaybookChecklistWithRun = {
    id: string;
    run_id: string;
    title: string;
    items?: PlaybookChecklistItem[];
    update_at: number;
}

type PlaybookChecklistItemWithChecklist = {
    id: string;
    checklist_id: string;
    title: string;
    description: string;
    state: ChecklistItemState;
    state_modified: number;
    assignee_id: string;
    assignee_modified: number;
    command: string;
    command_last_run: number;
    due_date: number;
    task_actions?: TaskAction[] | null;
    completed_at: number;
    update_at: number;
}
