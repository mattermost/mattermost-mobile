// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type SchedulingInfo = {
    scheduled_at: number;
    processed_at?: number;
    error_code?: string;
}

type ScheduledPost = Draft & SchedulingInfo &{
    id: string;
    priority?: PostPriority;
    file_ids?: string[];
}
