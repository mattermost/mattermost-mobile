// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type SchedulingInfo = {
    scheduled_at: number;
    processed_at?: number;
    error_code?: string;
}

type ScheduledPost = Draft & SchedulingInfo & {
    id: string;
    create_at: number;
    priority?: PostPriority;
    file_ids?: string[];
    user_id: string;
}

type FetchScheduledPostsResponse = {
    [teamdId: string]: ScheduledPost[];
    directChannels: ScheduledPost[];
}
