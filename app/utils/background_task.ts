// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import RNUtils from '@mattermost/rnutils';

import {logDebug} from '@utils/log';

const INVALID_TASK_ID = -1;

/**
 * Runs `task` while holding an iOS background-task assertion, asking the OS for
 * extra execution time so an in-flight operation can finish before the app is
 * suspended. This prevents 0xdead10cc terminations, where iOS kills the app for
 * holding a lock on a file in the shared App Group container (e.g. the
 * WatermelonDB SQLite write lock) at suspension.
 *
 * Best-effort: if the native call is unavailable or throws, the task still runs.
 * The background task is a no-op on Android (the platform has no equivalent
 * suspension lock-kill).
 *
 * @param name label used for log traceability
 * @param task the async work to protect
 */
export async function runWithBackgroundTask<T>(name: string, task: () => Promise<T>): Promise<T> {
    let taskId = INVALID_TASK_ID;
    try {
        taskId = RNUtils.beginBackgroundTask();
    } catch (e) {
        logDebug('runWithBackgroundTask: failed to begin background task', name, e);
    }

    // TEMP (device verification, remove before merge): confirms the background
    // task actually wrapped the write. Grep MMLogs for "runWithBackgroundTask".
    logDebug('runWithBackgroundTask: begin', name, 'taskId', taskId);

    try {
        return await task();
    } finally {
        if (taskId !== INVALID_TASK_ID) {
            try {
                RNUtils.endBackgroundTask(taskId);
            } catch (e) {
                logDebug('runWithBackgroundTask: failed to end background task', name, e);
            }
        }

        // TEMP (device verification, remove before merge)
        logDebug('runWithBackgroundTask: end', name, 'taskId', taskId);
    }
}
