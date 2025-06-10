// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type StatusPostComplete = {
    id: string;
    create_at: number;
    delete_at: number;
    message: string;
    author_user_name: string;
}

type FetchPlaybookRunsReturn = {
    total_count: number;
    page_count: number;
    has_more: boolean;
    items: PlaybookRun[];
}

type FetchPlaybookRunsParams = {
    page: number;
    per_page: number;
    team_id?: string;
    sort?: string;
    direction?: string;
    statuses?: string[];
    owner_user_id?: string;
    participant_id?: string;
    participant_or_follower_id?: string;
    search_term?: string;
    playbook_id?: string;
    active_gte?: number;
    active_lt?: number;
    started_gte?: number;
    started_lt?: number;
    channel_id?: string;
    since?: number;
}
