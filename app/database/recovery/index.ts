// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {restoreServerAfterDatabaseWipe} from '@actions/remote/restore_server';
import DatabaseManager from '@database/manager';
import {isDatabaseCorruptionError} from '@utils/database_errors';
import {getFullErrorMessage} from '@utils/errors';
import {logError, logInfo, logWarning} from '@utils/log';

const MAX_RECOVERY_ATTEMPTS = 1;
const RECOVERY_WINDOW_MS = 5 * 60 * 1000;

const recoveryInProgress = new Set<string>();
const recoveryState = new Map<string, {count: number; windowStart: number}>();

type RecoveryOptions = {
    resync?: boolean;
};

function canAttemptRecovery(serverUrl: string): boolean {
    const now = Date.now();
    const state = recoveryState.get(serverUrl);

    if (!state || now - state.windowStart > RECOVERY_WINDOW_MS) {
        return true;
    }

    return state.count < MAX_RECOVERY_ATTEMPTS;
}

function recordRecoveryAttempt(serverUrl: string): void {
    const now = Date.now();
    const state = recoveryState.get(serverUrl);

    if (!state || now - state.windowStart > RECOVERY_WINDOW_MS) {
        recoveryState.set(serverUrl, {count: 1, windowStart: now});
        return;
    }

    recoveryState.set(serverUrl, {count: state.count + 1, windowStart: state.windowStart});
}

export function resetDatabaseRecoveryStateForTests(): void {
    if (!__DEV__) {
        return;
    }

    recoveryInProgress.clear();
    recoveryState.clear();
}

export async function attemptServerDatabaseRecovery(
    serverUrl: string,
    error: unknown,
    source: string,
    options: RecoveryOptions = {},
): Promise<boolean> {
    if (!isDatabaseCorruptionError(error)) {
        return false;
    }

    if (recoveryInProgress.has(serverUrl)) {
        logWarning('attemptServerDatabaseRecovery: recovery already in progress', serverUrl, source);
        return false;
    }

    if (!canAttemptRecovery(serverUrl)) {
        logError(
            'attemptServerDatabaseRecovery: recovery loop detected, giving up',
            serverUrl,
            source,
            getFullErrorMessage(error),
        );
        return false;
    }

    recoveryInProgress.add(serverUrl);
    recordRecoveryAttempt(serverUrl);

    const shouldResync = options.resync ?? true;

    try {
        logError('attemptServerDatabaseRecovery: corruption detected', serverUrl, source, getFullErrorMessage(error));
        await DatabaseManager.wipeServerData(serverUrl);
        logInfo('attemptServerDatabaseRecovery: database wiped and recreated', serverUrl, source);

        if (shouldResync && DatabaseManager.serverDatabases[serverUrl]) {
            const {error: resyncError} = await restoreServerAfterDatabaseWipe(serverUrl);
            if (resyncError) {
                logError(
                    'attemptServerDatabaseRecovery: re-sync failed after recovery',
                    serverUrl,
                    source,
                    getFullErrorMessage(resyncError),
                );
            }
        }

        return true;
    } catch (recoveryError) {
        logError(
            'attemptServerDatabaseRecovery: recovery failed',
            serverUrl,
            source,
            getFullErrorMessage(recoveryError),
        );
        return false;
    } finally {
        recoveryInProgress.delete(serverUrl);
    }
}
