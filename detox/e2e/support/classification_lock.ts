// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Preference, {type UserPreference} from '@support/server_api/preference';
import User from '@support/server_api/user';
import {getRandomId, timeouts, wait} from '@support/utils';

const LOCK_CATEGORY = 'e2e_locks';
const LOCK_NAME = 'classification';

// Callers acquire from beforeAll and every caller sets jest.setTimeout(30m), so the
// wait budget must fit under that, not under Jest's 240s default.
//
// The budget has to exceed one full hold by another shard, otherwise a queued suite
// is starved rather than serialized: in CI 31276319392 the iOS across-screens suite
// held the lock for ~9m (20:47:03 -> 20:55) and the global-banner suite gave up after
// the old 2m budget, failing all 10 of its tests without ever running them.
const DEFAULT_TIMEOUT_MS = timeouts.ONE_MIN * 20;

// A run that is cancelled mid-suite (cancel-stale-e2e-on-push) never reaches
// releaseClassificationLock, so the only thing that frees the lock is this TTL — and
// the servers are per-PR, not per-run, so the next run inherits it. In CI 31276319392
// the Android shard waited on owner "31275211507-…", a run cancelled 25 minutes
// earlier. Keep the TTL under the wait budget above so a leaked lock always expires
// inside a single acquire, while still leaving ~2x headroom over the longest observed
// legitimate hold.
const DEFAULT_TTL_MS = timeouts.ONE_MIN * 18;
const DEFAULT_POLL_MS = timeouts.TWO_SEC;

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

const getClassificationLock = async (baseUrl: string, userId: string): Promise<ClassificationLock | undefined> => {
    const result = await Preference.apiGetUserPreferences(baseUrl, userId) as {
        preferences?: UserPreference[];
        error?: unknown;
    };
    if (!result.preferences) {
        throw new Error(`classification lock: failed to read admin preferences: ${formatError(result.error ?? result)}`);
    }

    const preference = result.preferences.find(
        (item) => item.category === LOCK_CATEGORY && item.name === LOCK_NAME,
    );
    return parseLock(preference?.value ?? '');
};

const saveClassificationLock = async (
    baseUrl: string,
    userId: string,
    value: string,
): Promise<void> => {
    const result = await Preference.apiSaveUserPreferences(baseUrl, userId, [{
        user_id: userId,
        category: LOCK_CATEGORY,
        name: LOCK_NAME,
        value,
    }]) as {error?: unknown};

    if (result.error) {
        throw new Error(`classification lock: failed to save admin preference: ${formatError(result.error)}`);
    }
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
    const deadline = Date.now() + timeoutMs;
    const userId = await loginAsAdmin(baseUrl);
    let lastLock: ClassificationLock | undefined;

    do {
        // eslint-disable-next-line no-await-in-loop -- advisory lock acquisition must be sequential
        lastLock = await getClassificationLock(baseUrl, userId);
        const now = Date.now();
        if (!lastLock || lastLock.expiresAt <= now || lastLock.owner === owner) {
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
