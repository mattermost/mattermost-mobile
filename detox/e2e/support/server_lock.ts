// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Advisory lock for suites that mutate server-wide configuration.
 *
 * CI provisions only two Detox servers and rotates them as SITE_1/SITE_2 across every
 * shard, so a suite that flips a global setting is visible to every other shard sharing
 * that server. Suites that do so take a named lock first; the lock cell is an admin user
 * preference on the server being mutated.
 *
 * A lock only serialises participants — it does not protect suites that never take it.
 * It is therefore a complement to, not a substitute for, running such a suite against a
 * server no one else uses.
 */

import {
    acquireLock,
    assertLockOwnership,
    formatError,
    releaseLock,
    type AcquireLockOptions,
    type LockStore,
} from '@support/classification_lock_core';
import Preference, {type UserPreference} from '@support/server_api/preference';
import User from '@support/server_api/user';
import {getRandomId} from '@support/utils';

const LOCK_CATEGORY = 'e2e_locks';

export type ServerLock = {
    createOwner: () => string;
    acquire: (baseUrl: string, owner: string, options?: AcquireLockOptions) => Promise<void>;
    release: (baseUrl: string, owner: string) => Promise<void>;

    /**
     * Throw unless `owner` still holds the lock. Cheap (one admin-preference read): call it
     * before config mutations and in beforeEach so a stolen lock fails the test immediately
     * with the stealer's identity instead of as downstream banner timeouts.
     */
    assertOwnership: (baseUrl: string, owner: string) => Promise<void>;
};

const loginAsAdmin = async (baseUrl: string, lockName: string) => {
    const result = await User.apiAdminLogin(baseUrl) as {user?: {id?: string}; error?: unknown};
    const userId = result.user?.id;
    if (!userId) {
        throw new Error(`${lockName} lock: admin login failed: ${formatError(result.error ?? result)}`);
    }

    return userId;
};

// The lock cell is an admin user preference on the shared test server.
const createPreferenceLockStore = (baseUrl: string, lockName: string): LockStore => {
    let userId: string | undefined;

    const withAdmin = async <T>(operation: (adminId: string) => Promise<T>): Promise<T> => {
        try {
            userId = userId ?? await loginAsAdmin(baseUrl, lockName);
            return await operation(userId);
        } catch (error) {
            userId = undefined;
            throw error;
        }
    };

    return {
        read: () => withAdmin(async (adminId) => {
            const result = await Preference.apiGetUserPreferences(baseUrl, adminId) as {
                preferences?: UserPreference[];
                error?: unknown;
            };
            if (!result.preferences) {
                throw new Error(`${lockName} lock: failed to read admin preferences: ${formatError(result.error ?? result)}`);
            }

            const preference = result.preferences.find(
                (item) => item.category === LOCK_CATEGORY && item.name === lockName,
            );
            return preference?.value ?? '';
        }),
        write: (value: string) => withAdmin(async (adminId) => {
            const result = await Preference.apiSaveUserPreferences(baseUrl, adminId, [{
                user_id: adminId,
                category: LOCK_CATEGORY,
                name: lockName,
                value,
            }]) as {error?: unknown};

            if (result.error) {
                throw new Error(`${lockName} lock: failed to save admin preference: ${formatError(result.error)}`);
            }
        }),
    };
};

/**
 * Build a named advisory lock. `lockName` is the preference key, so two different names
 * are two independent locks on the same server.
 */
export const createServerLock = (lockName: string): ServerLock => {
    return {
        createOwner: () => [
            process.env.GITHUB_RUN_ID || 'local',
            process.env.GITHUB_JOB || 'job',
            process.env.DETOX_CONFIGURATION || process.env.DETOX_CONFIG || 'detox',
            Date.now(),

            // Shards of the same job share every field above and can start in the same
            // millisecond; without this two owners would compare equal and both hold the lock.
            process.pid,
            getRandomId(),
        ].join('-'),

        acquire: (baseUrl: string, owner: string, options: AcquireLockOptions = {}) =>
            acquireLock(createPreferenceLockStore(baseUrl, lockName), owner, options),

        release: (baseUrl: string, owner: string) =>
            releaseLock(createPreferenceLockStore(baseUrl, lockName), owner),

        assertOwnership: (baseUrl: string, owner: string) =>
            assertLockOwnership(createPreferenceLockStore(baseUrl, lockName), owner),
    };
};
