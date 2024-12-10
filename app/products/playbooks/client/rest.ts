// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export type GetPlaybookRunsResults = {
    total_count: number;
    page_count: number;
    per_page: number;
    has_more: boolean;
    items: PlaybookRun[];
};

export type PlaybookRun = {
    id: string;
    name: string;
    summary: string;
    summary_modified_at: number;
    owner_user_id: string;
    reporter_user_id: string;
    team_id: string;
    channel_id: string;
    create_at: number;
    end_at: number;
    post_id: string;
    playbook_id: string;
    current_status: PlaybookRunStatus;
    last_status_update_at: number;
    reminder_post_id: string;
    previous_reminder: number;
    reminder_message_template: string;
    reminder_timer_default_seconds: number;
    status_update_enabled: boolean;
    retrospective: string;
    retrospective_published_at: number;
    retrospective_was_canceled: boolean;
    retrospective_reminder_interval_seconds: number;
    retrospective_enabled: boolean;
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
    checklists: Checklist[];
    metrics_data: RunMetricData[];
};

export enum PlaybookRunStatus {
    InProgress = 'InProgress',
    Finished = 'Finished',
}

export enum SortDirection {
    Desc = 'desc',
    Asc = 'asc',
}

export enum PlaybookRunSort {
    ID = 'id',
    Name = 'name',
    IsActive = 'is_active',
    CreateAt = 'create_at',
    EndAt = 'end_at',
    TeamId = 'team_id',
    OwnerUserId = 'owner_user_id',
}

export type TimelineEvent = {
    id: string;
    playbook_run_id: string;
    create_at: number;
    delete_at: number;
    event_at: number;
    event_type: string;
    summary: string;
    details: string;
    post_id: string;
    subject_user_id: string;
    creator_user_id: string;
};

export type StatusPost = {
    id: string;
    create_at: number;
    delete_at: number;
};

export type Checklist = {
    title: string;
    items: ChecklistItem[];
};

export type ChecklistItem = {
    title: string;
    description: string;
    state: string;
    state_modified: number;
    assignee_id: string;
    assignee_modified: number;
    command: string;
    command_last_run: number;
    due_date: number;
    task_actions: TaskAction[];
};

export type TriggerAction = {
    type: string;
    payload: string;
};

export type TaskAction = {
    trigger: TriggerAction;
    actions: TriggerAction[];
};

export type RunMetricData = {
    metric_config_id: string;
    value: number | null;
};

export type PlaybookRunsOptions = {
    page?: number;
    per_page?: number;
    sort?: PlaybookRunSort;
    direction?: SortDirection;
    statuses?: PlaybookRunStatus[];
    owner_user_id?: string;
    participant_id?: string;
    search_term?: string;
};

export interface ClientPlaybooksMix {
    getEnabled: () => Promise<Boolean>;
    getPlaybookRuns: (teamId: string, options?: PlaybookRunsOptions) => Promise<GetPlaybookRunsResults>;
}

const ClientPlaybooks = (superclass: any) => class extends superclass {
    getEnabled = async () => {
        try {
            await this.doFetch(
                `${this.getPlaybooksRoute()}/version`,
                {method: 'get'},
            );
            return true;
        } catch (e) {
            return false;
        }
    };

    getPlaybookRuns = async (teamId: string, {
        page,
        per_page,
        sort,
        direction,
        statuses,
        owner_user_id,
        participant_id,
        search_term,
    }: PlaybookRunsOptions = {}) => {
        const queryParams = new URLSearchParams();
        queryParams.append('team_id', teamId);

        if (typeof page !== 'undefined') {
            queryParams.append('page', page.toString());
        }
        if (typeof per_page !== 'undefined') {
            queryParams.append('per_page', per_page.toString());
        }
        if (sort) {
            queryParams.append('sort', sort);
        }
        if (direction) {
            queryParams.append('direction', direction);
        }
        if (statuses) {
            statuses.forEach((status) => queryParams.append('statuses', status));
        }
        if (owner_user_id) {
            queryParams.append('owner_user_id', owner_user_id);
        }
        if (participant_id) {
            queryParams.append('participant_id', participant_id);
        }
        if (search_term) {
            queryParams.append('search_term', search_term);
        }

        return this.doFetch(
            `${this.getPlaybooksRoute()}/runs?${queryParams.toString()}`,
            {method: 'get'},
        );
    };
};

export default ClientPlaybooks;
