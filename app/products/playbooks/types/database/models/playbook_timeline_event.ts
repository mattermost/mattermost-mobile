// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Model} from '@nozbe/watermelondb';

declare class PlaybookTimelineEventModel extends Model {
    runId: string;
    eventAt: number;
    eventType: string;
    details: string;
    subjectUserId: string;
    createAt: number;
    summary: string;
    postId: string;
    creatorUserId: string;
    toTimelineEvent: () => TimelineEvent;
}

export default PlaybookTimelineEventModel;
