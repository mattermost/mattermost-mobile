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
    title: string;
};

type TaskStateDetails = {
    action?: unknown;
    task?: unknown;
    item_id?: unknown;
};

type ActionMatch = {
    action: TaskActivityAction;
    details: TaskStateDetails;
    event: TimelineEvent;
};

const KNOWN_ACTIONS = new Set<string>(['check', 'uncheck', 'skip', 'restore']);

// A task's resting state bounds which actions could have produced it. Only the open states are
// ambiguous — both an uncheck and a restore-from-skip land on open — so a matched timeline event is
// what tells those apart; with no event we fall back to the first candidate. A state with no
// candidates renders nothing.
const getCandidateActions = (state: ChecklistItemState): TaskActivityAction[] => {
    switch (state) {
        case 'closed':
            return ['check'];
        case 'skipped':
            return ['skip'];
        case '':
        case 'open':
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
        // Invalid timeline event details are intentionally ignored.
    }

    return undefined;
};

const getDetailsAction = (details: TaskStateDetails): TaskActivityAction | undefined => {
    const {action} = details;
    return typeof action === 'string' && KNOWN_ACTIONS.has(action) ? action as TaskActivityAction : undefined;
};

export const getTaskActivity = (item: TaskActivityItem, timelineEvents: TimelineEvent[] = []): TaskActivity | undefined => {
    const timestamp = 'stateModified' in item ? item.stateModified : item.state_modified;
    const candidates = getCandidateActions(item.state);
    if (!timestamp || !candidates.length) {
        return undefined;
    }

    // Restricting candidates by the resting state also keeps a stale or contradictory event from
    // matching, e.g. a check event against an open task.
    const matches = timelineEvents.flatMap<ActionMatch>((event) => {
        if (event.event_at !== timestamp) {
            return [];
        }

        const details = getEventDetails(event);
        if (!details) {
            return [];
        }

        const action = getDetailsAction(details);
        return action && candidates.includes(action) ? [{action, details, event}] : [];
    });

    // Stable id join, preferred: events from current servers carry details.item_id, which links an
    // event to exactly one task. That is unambiguous, so it needs no title tiebreak and is immune to
    // same-millisecond collisions and duplicate titles.
    let matched = matches.find(({details}) => details.item_id === item.id);

    if (!matched) {
        // Legacy fallback for events predating details.item_id. Never consider an event that names a
        // different item — an id-carrying event belongs to whichever task it names, so it isn't ours.
        //
        // Note the title tiebreak is weaker than it looks: the server writes details.task stripped of
        // markdown while item.title keeps it, so it cannot match for markdown titles. It is a last
        // resort only, and unresolved ambiguity deliberately yields no actor rather than a guess.
        const legacy = matches.filter(({details}) => !details.item_id || details.item_id === item.id);
        if (legacy.length === 1) {
            matched = legacy[0];
        } else if (legacy.length > 1) {
            const titleMatches = legacy.filter(({details}) => details.task === item.title);
            if (titleMatches.length === 1) {
                matched = titleMatches[0];
            }
        }
    }

    // Skip requires event confirmation, unlike check/uncheck. The routes both clients actually use
    // (PUT .../item/{n}/skip and .../restore -> SkipChecklistItem/RestoreChecklistItem) record
    // neither state_modified nor a timeline event; a skip's time lands in LastSkipped (serialized as
    // `delete_at`, which mobile does not persist). So for a skipped task state_modified is either 0
    // or a leftover from an earlier check/uncheck, and labelling that "Skipped" would show a time the
    // skip did not happen at. Showing nothing is correct until the server records skips; this then
    // lights up on its own, since ModifyCheckedState already emits action: 'skip'.
    if (item.state === 'skipped' && !matched) {
        return undefined;
    }

    // The verb comes from the matched event when there is one, since an open task cannot reveal on
    // its own whether it was unchecked or restored.
    return {
        action: matched?.action ?? candidates[0],
        actorUserId: matched?.event.subject_user_id || undefined,
        timestamp,
    };
};
