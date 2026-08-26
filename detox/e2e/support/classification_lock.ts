// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Preference, {type UserPreference} from '@support/server_api/preference';
import User from '@support/server_api/user';
import {getRandomId, timeouts, wait} from '@support/utils';
import {withTransportRetry, type ApiResult} from '@support/utils/transport_retry';

const LOCK_CATEGORY = 'e2e_locks';
const LOCK_NAME = 'classification';
const DEFAULT_TIMEOUT_MS = timeouts.ONE_MIN * 20;
const DEFAULT_TTL_MS = timeouts.ONE_MIN * 35;
const DEFAULT_POLL_MS = timeouts.TWO_SEC;
const NETWORK_RETRY_DELAY_MS = timeouts.TWO_SEC;
const CONFIRM_SETTLE_MS = timeouts.ONE_SEC;

// Transport faults get a few polls to clear (~8s at DEFAULT_POLL_MS) before we give
// up. Deliberately much smaller than DEFAULT_TIMEOUT_MS, which exists for lock
// contention, not for an unreachable server.
const MAX_CONSECUTIVE_TRANSPORT_FAILURES = 5;

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

        // Logging in again only replaces the session cookie, so a replayed login has
        // no duplicate-record risk.
        {delayMs: NETWORK_RETRY_DELAY_MS, idempotent: true, label: 'classification lock admin login'},
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
        {delayMs: NETWORK_RETRY_DELAY_MS, idempotent: true, label: 'classification lock read'},
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

        // Upsert of one fixed category/name pair, so a replay overwrites the same row
        // with the same value rather than creating a second one.
        {delayMs: NETWORK_RETRY_DELAY_MS, idempotent: true, label: 'classification lock write'},
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
    let lastTransportError: unknown;
    let consecutiveTransportFailures = 0;

    do {
        // A transport fault against the ephemeral test server is the same kind of
        // "try again shortly" this loop already exists for, so absorb it here rather
        // than abandoning acquisition on the first blip.
        try {
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
            lastTransportError = undefined;
            consecutiveTransportFailures = 0;
        } catch (error) {
            lastTransportError = error;
            consecutiveTransportFailures += 1;

            // Absorb a blip, but do not sit here for the full contention deadline
            // (20 min by default) when the server is simply down — that would turn a
            // 15ms failure into a 20-minute one for every spec that takes the lock.
            if (consecutiveTransportFailures >= MAX_CONSECUTIVE_TRANSPORT_FAILURES) {
                throw new Error(
                    `classification lock: ${consecutiveTransportFailures} consecutive transport ` +
                    `failures reading/writing the lock. Last error: ${formatError(error)}`,
                );
            }
        }

        if (Date.now() < deadline) {
            // eslint-disable-next-line no-await-in-loop
            await wait(Math.min(pollMs, deadline - Date.now()));
        }
    } while (Date.now() < deadline);

    if (lastTransportError) {
        throw new Error(
            `classification lock: gave up after ${timeoutMs}ms of transport failures. ` +
            `Last error: ${formatError(lastTransportError)}`,
        );
    }

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
