// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {toMilliseconds} from '@utils/datetime';

import type PlaybookChecklistItemModel from '@playbooks/types/database/models/playbook_checklist_item';
import type PlaybookRunModel from '@playbooks/types/database/models/playbook_run';

export function getRunScheduledTimestamp(run: PlaybookRunModel | PlaybookRun): number {
    const endAt = 'endAt' in run ? run.endAt : run.end_at;
    const lastStatusUpdateAt = 'lastStatusUpdateAt' in run ? run.lastStatusUpdateAt : run.last_status_update_at;
    const previousReminder = 'previousReminder' in run ? run.previousReminder : run.previous_reminder;

    const isNextUpdateScheduled = previousReminder !== 0;
    const isFinished = isRunFinished(run);
    let timestamp = lastStatusUpdateAt;
    if (isFinished) {
        timestamp = endAt;
    } else if (isNextUpdateScheduled) {
        const previousReminderMillis = Math.floor(previousReminder / 1e6);
        timestamp = lastStatusUpdateAt + previousReminderMillis;
    }
    return timestamp;
}

export function isRunFinished(run: PlaybookRunModel | PlaybookRun): boolean {
    const currentStatus = 'currentStatus' in run ? run.currentStatus : run.current_status;
    return currentStatus === 'Finished';
}

export function getMaxRunUpdateAt(runs: PlaybookRun[]): number {
    let max = 0;
    for (const run of runs) {
        if (run.update_at > max) {
            max = run.update_at;
        }
    }
    return max;
}

export function isOverdue(item: PlaybookChecklistItemModel | PlaybookChecklistItem): boolean {
    const dueDate = 'dueDate' in item ? item.dueDate : item.due_date;
    if (dueDate <= 0) {
        return false;
    }

    if (item.state !== '' && item.state !== 'in_progress') {
        return false;
    }

    return dueDate < Date.now();
}

export function isDueSoon(item: PlaybookChecklistItemModel | PlaybookChecklistItem): boolean {
    const dueDate = 'dueDate' in item ? item.dueDate : item.due_date;
    if (dueDate <= 0) {
        return false;
    }

    if (item.state !== '' && item.state !== 'in_progress') {
        return false;
    }

    return dueDate < Date.now() + toMilliseconds({hours: 12});
}
