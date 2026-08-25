// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Preference, {type UserPreference} from '@support/server_api/preference';
import User from '@support/server_api/user';
import {getRandomId, timeouts, wait} from '@support/utils';

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
    let lastTransportError: unknown;
    let consecutiveTransportFailures = 0;

    do {
        // A transport fault against the ephemeral test server is the same kind of
        // "try again shortly" this loop already exists for, so absorb it here rather
        // than abandoning acquisition on the first blip. Run 32808521698 lost
        // MM-T6206_1 and MM-T6208_1 to a single `getaddrinfo ENOTFOUND` on the read:
        // each test died in under 15ms with no retry, while the blip itself lasted
        // ~120ms and every other shard reached the same host fine. If the fault
        // outlasts the deadline the error is rethrown below, so nothing is hidden.
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
