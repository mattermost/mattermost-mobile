// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Preference, {type UserPreference} from '@support/server_api/preference';
import User from '@support/server_api/user';
import {timeouts, wait} from '@support/utils';

const LOCK_CATEGORY = 'e2e_locks';
const LOCK_NAME = 'classification';
const DEFAULT_TIMEOUT_MS = timeouts.ONE_MIN * 20;
const DEFAULT_TTL_MS = timeouts.ONE_MIN * 30;
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
