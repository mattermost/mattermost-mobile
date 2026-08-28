// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    acquireLock,
    formatError,
    releaseLock,
    type AcquireLockOptions,
    type LockStore,
} from '@support/classification_lock_core';
import Preference, {type UserPreference} from '@support/server_api/preference';
import User from '@support/server_api/user';
import {getRandomId} from '@support/utils';

const LOCK_CATEGORY = 'e2e_locks';
const LOCK_NAME = 'classification';

const loginAsAdmin = async (baseUrl: string) => {
    const result = await User.apiAdminLogin(baseUrl) as {user?: {id?: string}; error?: unknown};
    const userId = result.user?.id;
    if (!userId) {
        throw new Error(`classification lock: admin login failed: ${formatError(result.error ?? result)}`);
    }

    return userId;
};

// The lock cell is an admin user preference on the shared test server.
const createPreferenceLockStore = (baseUrl: string): LockStore => {
    let userId: string | undefined;

    const withAdmin = async <T>(operation: (adminId: string) => Promise<T>): Promise<T> => {
        try {
            userId = userId ?? await loginAsAdmin(baseUrl);
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
                throw new Error(`classification lock: failed to read admin preferences: ${formatError(result.error ?? result)}`);
            }

            const preference = result.preferences.find(
                (item) => item.category === LOCK_CATEGORY && item.name === LOCK_NAME,
            );
            return preference?.value ?? '';
        }),
        write: (value: string) => withAdmin(async (adminId) => {
            const result = await Preference.apiSaveUserPreferences(baseUrl, adminId, [{
                user_id: adminId,
                category: LOCK_CATEGORY,
                name: LOCK_NAME,
                value,
            }]) as {error?: unknown};

            if (result.error) {
                throw new Error(`classification lock: failed to save admin preference: ${formatError(result.error)}`);
            }
        }),
    };
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
    options: AcquireLockOptions = {},
): Promise<void> => {
    return acquireLock(createPreferenceLockStore(baseUrl), owner, options);
};

export const releaseClassificationLock = async (baseUrl: string, owner: string): Promise<void> => {
    return releaseLock(createPreferenceLockStore(baseUrl), owner);
};
