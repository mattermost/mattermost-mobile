// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type ScheduledPost = Draft & {
    id: string;
    scheduled_at: number;
    processed_at: number;
    error_code: string;
}
