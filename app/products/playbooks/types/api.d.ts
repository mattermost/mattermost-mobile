// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type ChecklistItemState = '' | 'in_progress' | 'closed' | 'skipped';

const PlaybookRunStatus = {
    InProgress: 'InProgress',
    Finished: 'Finished',
} as const;

type TriggerAction = {
    type: string;
    payload: string;
}

type TaskAction = {
    trigger: TriggerAction;
    actions: TriggerAction[];
}

type PlaybookChecklistItem = {
    id: string;
    title: string;
    description: string;
    state: ChecklistItemState;
    state_modified: number;
    assignee_id: string;
    assignee_modified: number;
    command: string;
    command_last_run: number;
    due_date: number;
    task_actions?: TaskAction[];
    completed_at: number;
    update_at: number;
}

type PlaybookChecklist = {
    id: string;
    title: string;
    items: PlaybookChecklistItem[];
    update_at: number;
    items_order: string[];
}

type RunMetricData = {
    metric_config_id: string;
    value: number | null;
}

type StatusPost = {
    id: string;
    create_at: number;
}

type TimelineEvent = {
    id: string;
    playbook_run_id: string;
    create_at: number;
    event_at: number;
    event_type: string;
    summary: string;
    details: string;
    post_id: string;
    subject_user_id: string;
    creator_user_id: string;
}

type PlaybookRunStatusType = typeof PlaybookRunStatus[keyof typeof PlaybookRunStatus];

type PlaybookRun = {
    id: string;
    name: string;
    description: string;
    is_active: boolean;
    active_stage: number;
    active_stage_title: string;
    summary: string;
    summary_modified_at: number;
    owner_user_id: string;
    reported_user_id: string;
    team_id: string;
    channel_id: string;
    create_at: number;
    end_at: number;
    post_id?: string;
    playbook_id: string;
    current_status: PlaybookRunStatusType;
    last_status_update_at: number;
    reminder_post_id?: string;
    previous_reminder: number;
    reminder_message_template?: string;
    status_update_enabled: boolean;
    retrospective_enabled: boolean;
    retrospective: string;
    retrospective_published_at: number;
    retrospective_was_canceled: boolean;
    retrospective_reminder_interval_seconds: number;
    message_on_join: string;
    category_name: string;
    create_channel_member_on_new_participant: boolean;
    remove_channel_member_on_removed_participant: boolean;
    invited_user_ids: string[];
    invited_group_ids: string[];
    timeline_events: TimelineEvent[];
    participant_ids: string[];
    broadcast_channel_ids: string[];
    webhook_on_creation_urls: string[];
    webhook_on_status_update_urls: string[];
    status_posts: StatusPost[];
    checklists: PlaybookChecklist[];
    metrics_data: RunMetricData[];
    update_at: number;
    items_order: string[];
}
