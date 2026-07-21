// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export type TaskActivity = {
    action: 'check' | 'uncheck';
    actorUserId?: string;
    timestamp: number;
};

type TaskActivityItem = PlaybookChecklistItem | {
    state: ChecklistItemState;
    stateModified: number;
    title: string;
};

type TaskStateDetails = {
    action?: unknown;
    task?: unknown;
};

const getEventDetails = (event: TimelineEvent): TaskStateDetails | undefined => {
    if (event.event_type !== 'task_state_modified') {
        return undefined;
    }

    try {
        const details = JSON.parse(event.details);
        if (details && typeof details === 'object' && !Array.isArray(details)) {
            return details as TaskStateDetails;
        }
    } catch {
        // Invalid timeline event details are intentionally ignored.
    }

    return undefined;
};

export const getTaskActivity = (item: TaskActivityItem, timelineEvents: TimelineEvent[] = []): TaskActivity | undefined => {
    const timestamp = 'stateModified' in item ? item.stateModified : item.state_modified;
    if (!timestamp || item.state === 'skipped') {
        return undefined;
    }

    let action: TaskActivity['action'] | undefined;
    if (item.state === 'closed') {
        action = 'check';
    } else if (item.state === '' || item.state === 'open') {
        action = 'uncheck';
    }

    if (!action) {
        return undefined;
    }

    const matches = timelineEvents.flatMap((event) => {
        if (event.event_at !== timestamp) {
            return [];
        }

        const details = getEventDetails(event);
        return details?.action === action ? [{details, event}] : [];
    });

    let matchedEvent: TimelineEvent | undefined;
    if (matches.length === 1) {
        matchedEvent = matches[0].event;
    } else if (matches.length > 1) {
        const titleMatches = matches.filter(({details}) => details.task === item.title);
        if (titleMatches.length === 1) {
            matchedEvent = titleMatches[0].event;
        }
    }

    return {
        action,
        actorUserId: matchedEvent?.subject_user_id || undefined,
        timestamp,
    };
};
