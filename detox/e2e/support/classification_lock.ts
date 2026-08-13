// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Preference, {type UserPreference} from '@support/server_api/preference';
import User from '@support/server_api/user';
import {getRandomId, timeouts, wait} from '@support/utils';
import {withTransportRetry, type ApiResult} from '@support/utils/transport_retry';

const LOCK_CATEGORY = 'e2e_locks';
const LOCK_NAME = 'classification';
const DEFAULT_TIMEOUT_MS = timeouts.ONE_MIN * 20;

// Must outlast the longest hold a caller can legitimately take, or the lock expires
// mid-suite and a waiting shard steals it while the owner is still mutating shared
// server config. Every caller sets jest.setTimeout(30m), so the TTL covers that plus
// margin. Recovering a lock leaked by a cancelled run is the acquire budget's job,
// not the TTL's.
const DEFAULT_TTL_MS = timeouts.ONE_MIN * 35;
const DEFAULT_POLL_MS = timeouts.TWO_SEC;

// A single transient network error used to abort the whole suite. One
// `getaddrinfo ENOTFOUND` on the runner lost all 10 tests of
// global_classification_banner: the spec either side of it passed against the same host, admin login succeeded
// one request earlier, the hostname still resolves, and no other shard saw it. The acquire
// loop below already budgets 20 minutes, so spending a few seconds on retries costs nothing.
// The retry loop itself lives in @support/utils/transport_retry (kept dependency-free and
// unit-tested there); this constant stays here so production uses exactly timeouts.TWO_SEC,
// including under LOW_BANDWIDTH_MODE.
const NETWORK_RETRY_DELAY_MS = timeouts.TWO_SEC;

// The write in acquireClassificationLock is not a compare-and-swap, so two shards that both
// read "free" can both write and both confirm. Re-reading after a settle delay closes the
// window where the loser's write lands just after the winner's confirm. This narrows the
// race, it does not eliminate it — a real mutex needs a server-side unique constraint.
// Acceptable because under the "never unset the flag" invariant the only conflicting
// mutation left is MM-T6204_1's toggle, which restores the flag before releasing.
const CONFIRM_SETTLE_MS = timeouts.ONE_SEC;

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
    const result = await withTransportRetry(
        () => User.apiAdminLogin(baseUrl) as Promise<ApiResult & {user?: {id?: string}}>,
        {delayMs: NETWORK_RETRY_DELAY_MS},
    );
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
    const result = await withTransportRetry(
        () => Preference.apiGetUserPreferences(baseUrl, userId) as Promise<ApiResult & {preferences?: UserPreference[]}>,
        {delayMs: NETWORK_RETRY_DELAY_MS},
    );
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
    const result = await withTransportRetry(
        () => Preference.apiSaveUserPreferences(baseUrl, userId, [{
            user_id: userId,
            category: LOCK_CATEGORY,
            name: LOCK_NAME,
            value,
        }]) as Promise<ApiResult>,
        {delayMs: NETWORK_RETRY_DELAY_MS},
    );

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

            // Settle before confirming. A confirm issued immediately can read back our own
            // write while a competing shard's write is still in flight, so both shards would
            // see themselves as owner and both proceed. Waiting lets any concurrent write
            // land first, so the confirm observes the real last-writer-wins outcome.
            // eslint-disable-next-line no-await-in-loop
            await wait(CONFIRM_SETTLE_MS);

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
