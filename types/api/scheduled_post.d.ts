// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type Draft = {
    channel_id: string;
    files?: FileInfo[];
    message?: string;
    root_id: string;
    metadata?: PostMetadata;
    update_at: number;
};

type ScheduledPost = Draft & {
    id: string;
    scheduled_at: number;
    processed_at: number;
    error_code: string;
}
