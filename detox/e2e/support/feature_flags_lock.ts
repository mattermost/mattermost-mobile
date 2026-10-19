// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Serialises FeatureFlags read-modify-write on a shared Detox server.
 *
 * FeatureFlags booleans cannot be patched one-at-a-time: omitted keys become false.
 * Helpers therefore GET the full map, merge, and PUT it back. That RMW is only safe
 * among callers that take this lock. It does not protect suites that still write
 * FeatureFlags without it.
 */

import {createServerLock} from '@support/server_lock';

const featureFlagsLock = createServerLock('feature_flags');

// Short critical section (GET + PATCH). timeoutMs must exceed ttlMs.
const FEATURE_FLAGS_LOCK_OPTIONS = {
    timeoutMs: 3 * 60_000,
    ttlMs: 60_000,
    pollMs: 2_000,
    renewMs: 15_000,
};

export const withFeatureFlagsLock = async <T>(baseUrl: string, fn: () => Promise<T>): Promise<T> => {
    const owner = featureFlagsLock.createOwner();
    await featureFlagsLock.acquire(baseUrl, owner, FEATURE_FLAGS_LOCK_OPTIONS);
    try {
        return await fn();
    } finally {
        await featureFlagsLock.release(baseUrl, owner);
    }
};
