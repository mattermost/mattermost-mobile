// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Preference, {type UserPreference} from '@support/server_api/preference';
import User from '@support/server_api/user';
import {getRandomId, timeouts, wait} from '@support/utils';

const LOCK_CATEGORY = 'e2e_locks';
const LOCK_NAME = 'classification';

// Suites set jest.setTimeout(5m); lock wait/TTL stay within the same budget so
// peer classification specs serialize without multi-tens-of-minutes hangs.
const DEFAULT_TIMEOUT_MS = timeouts.ONE_MIN * 5;
const DEFAULT_TTL_MS = timeouts.ONE_MIN * 5;
const DEFAULT_POLL_MS = timeouts.TWO_SEC;

// Parallel CI runs share the same cloud admin preference. Steal a lock held by
// a different GITHUB_RUN_ID after a short grace so one stuck run cannot block
// another for the full TTL.
const FOREIGN_STEAL_AFTER_MS = timeouts.ONE_MIN * 2;

type ClassificationLock = {
    owner: string;
    expiresAt: number;
};

type ClassificationLockOptions = {
    timeoutMs?: number;
    ttlMs?: number;
    pollMs?: number;
};

const formatError = (value: unknown) => {
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
};

const loginAsAdmin = async (baseUrl: string) => {
    const result = await User.apiAdminLogin(baseUrl) as {user?: {id?: string}; error?: unknown};
    const userId = result.user?.id;
    if (!userId) {
        throw new Error(`classification lock: admin login failed: ${formatError(result.error ?? result)}`);
    }

    return userId;
};

const parseLock = (value: string): ClassificationLock | undefined => {
    if (!value) {
        return undefined;
    }

    try {
        const parsed = JSON.parse(value) as Partial<ClassificationLock>;
        if (typeof parsed.owner === 'string' && typeof parsed.expiresAt === 'number') {
            return {
                owner: parsed.owner,
                expiresAt: parsed.expiresAt,
            };
        }
    } catch {
        return undefined;
    }

    return undefined;
};

const isTransientNetworkError = (error: unknown): boolean => {
    const msg = formatError(error).toLowerCase();
    return (
        msg.includes('socket hang up') ||
        msg.includes('enotfound') ||
        msg.includes('econnreset') ||
        msg.includes('etimedout') ||
        msg.includes('network') ||
        msg.includes('524') ||
        msg.includes('502') ||
        msg.includes('503')
    );
};

const getClassificationLock = async (baseUrl: string, userId: string): Promise<ClassificationLock | undefined> => {
    let lastError: unknown;
    for (let attempt = 0; attempt < 4; attempt++) {
        if (attempt > 0) {
            // eslint-disable-next-line no-await-in-loop
            await wait(timeouts.TWO_SEC * attempt);
        }
        // eslint-disable-next-line no-await-in-loop
        const result = await Preference.apiGetUserPreferences(baseUrl, userId) as {
            preferences?: UserPreference[];
            error?: unknown;
        };
        if (result.preferences) {
            const preference = result.preferences.find(
                (item) => item.category === LOCK_CATEGORY && item.name === LOCK_NAME,
            );
            return parseLock(preference?.value ?? '');
        }
        lastError = result.error ?? result;
        if (!isTransientNetworkError(lastError)) {
            break;
        }
    }
    throw new Error(`classification lock: failed to read admin preferences: ${formatError(lastError)}`);
};

const saveClassificationLock = async (
    baseUrl: string,
    userId: string,
    value: string,
): Promise<void> => {
    let lastError: unknown;
    for (let attempt = 0; attempt < 4; attempt++) {
        if (attempt > 0) {
            // eslint-disable-next-line no-await-in-loop
            await wait(timeouts.TWO_SEC * attempt);
        }
        // eslint-disable-next-line no-await-in-loop
        const result = await Preference.apiSaveUserPreferences(baseUrl, userId, [{
            user_id: userId,
            category: LOCK_CATEGORY,
            name: LOCK_NAME,
            value,
        }]) as {error?: unknown};

        if (!result.error) {
            return;
        }
        lastError = result.error;
        if (!isTransientNetworkError(lastError)) {
            break;
        }
    }
    throw new Error(`classification lock: failed to save admin preference: ${formatError(lastError)}`);
};

const isForeignRunOwner = (owner: string): boolean => {
    const runId = process.env.GITHUB_RUN_ID;
    if (!runId) {
        return false;
    }
    return !owner.startsWith(`${runId}-`);
};

export const createClassificationLockOwner = () => {
    return [
        process.env.GITHUB_RUN_ID || 'local',
        process.env.GITHUB_JOB || 'job',
        process.env.DETOX_CONFIGURATION || process.env.DETOX_CONFIG || 'detox',
        Date.now(),

        // Shards of the same job share every field above and can start in the same
        // millisecond; without this two owners would compare equal and both hold the lock.
        process.pid,
        getRandomId(),
    ].join('-');
};

export const acquireClassificationLock = async (
    baseUrl: string,
    owner: string,
    options: ClassificationLockOptions = {},
): Promise<void> => {
    if (!owner) {
        throw new Error('classification lock: owner must not be empty');
    }

    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    const pollMs = options.pollMs ?? DEFAULT_POLL_MS;
    const startedAt = Date.now();
    const deadline = startedAt + timeoutMs;
    const userId = await loginAsAdmin(baseUrl);
    let lastLock: ClassificationLock | undefined;

    do {
        // eslint-disable-next-line no-await-in-loop -- advisory lock acquisition must be sequential
        lastLock = await getClassificationLock(baseUrl, userId);
        const now = Date.now();
        const foreignStale = Boolean(
            lastLock &&
            lastLock.expiresAt > now &&
            lastLock.owner !== owner &&
            isForeignRunOwner(lastLock.owner) &&
            (now - startedAt) >= FOREIGN_STEAL_AFTER_MS,
        );
        if (!lastLock || lastLock.expiresAt <= now || lastLock.owner === owner || foreignStale) {
            // eslint-disable-next-line no-await-in-loop
            await saveClassificationLock(baseUrl, userId, JSON.stringify({
                owner,
                expiresAt: now + ttlMs,
            }));

            // eslint-disable-next-line no-await-in-loop -- confirm ownership after the non-atomic write
            const confirmedLock = await getClassificationLock(baseUrl, userId);
            if (confirmedLock?.owner === owner) {
                return;
            }
            lastLock = confirmedLock;
        }

        if (Date.now() < deadline) {
            // eslint-disable-next-line no-await-in-loop
            await wait(Math.min(pollMs, deadline - Date.now()));
        }
    } while (Date.now() < deadline);

    throw new Error(
        `classification lock: timed out after ${timeoutMs}ms waiting for owner ` +
        `"${lastLock?.owner ?? 'unknown'}" (expiresAt=${lastLock?.expiresAt ?? 'unknown'})`,
    );
};

export const releaseClassificationLock = async (baseUrl: string, owner: string): Promise<void> => {
    if (!owner) {
        return;
    }

    const userId = await loginAsAdmin(baseUrl);
    const lock = await getClassificationLock(baseUrl, userId);
    if (lock?.owner === owner) {
        await saveClassificationLock(baseUrl, userId, '');
    }
};
