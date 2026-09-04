// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {restoreServerAfterDatabaseWipe} from '@actions/remote/restore_server';
import DatabaseManager from '@database/manager';
import {isDatabaseCorruptionError} from '@utils/database_errors';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug, logError, logInfo, logWarning} from '@utils/log';

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

    // All attempts should be recorded to avoid entering a loop if the database
    // gets corrupted when getting recreated.
    recordRecoveryAttempt(serverUrl);

    const shouldResync = options.resync ?? true;

    try {
        logError('attemptServerDatabaseRecovery: corruption detected', serverUrl, source, getFullErrorMessage(error));
        await DatabaseManager.wipeServerData(serverUrl);
        logInfo('attemptServerDatabaseRecovery: database wiped and recreated', serverUrl, source);

        const database = DatabaseManager.serverDatabases[serverUrl];
        if (!database) {
            logDebug('attemptServerDatabaseRecovery: database not found after wipe', serverUrl, source);
            return true;
        }

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

const APP_DATABASE_RECOVERY_KEY = '@app';

export async function attemptAppDatabaseRecovery(
    error: unknown,
    source: string,
): Promise<boolean> {
    if (!isDatabaseCorruptionError(error)) {
        return false;
    }

    if (recoveryInProgress.has(APP_DATABASE_RECOVERY_KEY)) {
        logWarning('attemptAppDatabaseRecovery: recovery already in progress', source);
        return false;
    }

    if (!canAttemptRecovery(APP_DATABASE_RECOVERY_KEY)) {
        logError(
            'attemptAppDatabaseRecovery: recovery loop detected, giving up',
            source,
            getFullErrorMessage(error),
        );
        return false;
    }

    recoveryInProgress.add(APP_DATABASE_RECOVERY_KEY);
    recordRecoveryAttempt(APP_DATABASE_RECOVERY_KEY);

    try {
        logError('attemptAppDatabaseRecovery: corruption detected', source, getFullErrorMessage(error));
        await DatabaseManager.wipeAppDatabase();
        logInfo('attemptAppDatabaseRecovery: app database wiped and recreated', source);
        return true;
    } catch (recoveryError) {
        logError(
            'attemptAppDatabaseRecovery: recovery failed',
            source,
            getFullErrorMessage(recoveryError),
        );
        return false;
    } finally {
        recoveryInProgress.delete(APP_DATABASE_RECOVERY_KEY);
    }
}
