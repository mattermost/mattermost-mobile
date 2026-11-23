// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export type TaskActivityAction = 'check' | 'uncheck' | 'skip' | 'restore';

export type TaskActivity = {
    action: TaskActivityAction;
    actorUserId?: string;
    timestamp: number;
};

type TaskActivityItem = PlaybookChecklistItem | {
    id: string;
    state: ChecklistItemState;
    stateModified: number;
};

type TaskStateDetails = {
    action?: unknown;
    item_id?: unknown;
};

type ActionMatch = {
    action: TaskActivityAction;
    details: TaskStateDetails;
    event: TimelineEvent;
};

// Which actions could have left a task in this state. Uncheck and restore both land on open, so only
// a matched event can tell them apart.
const getCandidateActions = (state: ChecklistItemState): TaskActivityAction[] => {
    switch (state) {
        case 'closed':
            return ['check'];
        case 'skipped':
            return ['skip'];
        case '':
            return ['uncheck', 'restore'];
        default:
            return [];
    }
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
        // Malformed details cannot be attributed, so the event is ignored.
    }

    return undefined;
};

// A timestamp a Date cannot hold throws while the run screen renders.
const MAX_DATE_MS = 8.64e15;
const isValidTimestamp = (timestamp: number) => Number.isFinite(timestamp) && timestamp > 0 && timestamp <= MAX_DATE_MS;

export const getTaskActivity = (item: TaskActivityItem, timelineEvents: TimelineEvent[] = []): TaskActivity | undefined => {
    const timestamp = 'stateModified' in item ? item.stateModified : item.state_modified;
    const candidates = getCandidateActions(item.state);
    if (!isValidTimestamp(timestamp) || !candidates.length) {
        return undefined;
    }

    const matches = timelineEvents.flatMap<ActionMatch>((event) => {
        if (event.event_at !== timestamp) {
            return [];
        }
        const details = getEventDetails(event);
        const action = details?.action;
        if (!details || typeof action !== 'string' || !candidates.includes(action as TaskActivityAction)) {
            return [];
        }
        return [{action: action as TaskActivityAction, details, event}];
    });

    // Servers that record skip and restore put the task's id in details.item_id. Older servers omit
    // it, so an event without one is used only when it is the sole match: an ambiguous match shows no
    // actor rather than the wrong one.
    let matched = matches.find(({details}) => details.item_id === item.id);
    if (!matched) {
        const unlinked = matches.filter(({details}) => !details.item_id);
        matched = unlinked.length === 1 ? unlinked[0] : undefined;
    }

    // Before v2.12 the server recorded no event for skip or restore and left state_modified at an
    // earlier check or uncheck, so only a checked task's time can be trusted without an event.
    if (item.state !== 'closed' && !matched) {
        return undefined;
    }

    return {
        action: matched?.action ?? candidates[0],
        actorUserId: matched?.event.subject_user_id || undefined,
        timestamp,
    };
};

// Every run change recomputes each task's activity, so rows compare it to skip re-rendering.
export const isSameTaskActivity = (a?: TaskActivity, b?: TaskActivity) => (
    a?.action === b?.action && a?.actorUserId === b?.actorUserId && a?.timestamp === b?.timestamp
);
