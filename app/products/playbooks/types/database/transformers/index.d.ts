// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type PlaybookChecklistWithRun = {
    id: string;
    delete_at: number;
    run_id: string;
    title: string;
    order: number;
    items?: PlaybookChecklistItem[];
}

type PlaybookChecklistItemWithChecklist = {
    id: string;
    checklist_id: string;
    title: string;
    description: string;
    state: string;
    state_modified: number;
    assignee_id: string;
    assignee_modified: number;
    command: string;
    command_last_run: number;
    due_date: number;
    task_actions?: TaskAction[] | null;
    order: number;
    completed_at: number;
    delete_at: number;
}
