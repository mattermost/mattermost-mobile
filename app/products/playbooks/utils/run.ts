// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type PlaybookRunModel from '@playbooks/types/database/models/playbook_run';

export function getRunScheduledTimestamp(run: PlaybookRunModel | PlaybookRun): number {
    const endAt = 'endAt' in run ? run.endAt : run.end_at;
    const lastStatusUpdateAt = 'lastStatusUpdateAt' in run ? run.lastStatusUpdateAt : run.last_status_update_at;
    const previousReminder = 'table' in run ? run.previousReminder : run.previous_reminder;

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
