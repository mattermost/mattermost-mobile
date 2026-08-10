// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import System from '@support/server_api/system';
import {timeouts, wait} from '@support/utils';

const isTransientConfigError = (error: unknown): boolean => {
    const msg = JSON.stringify(error).toLowerCase();
    return (
        msg.includes('524') ||
        msg.includes('502') ||
        msg.includes('503') ||
        msg.includes('timeout') ||
        msg.includes('socket hang up') ||
        msg.includes('econnreset')
    );
};

const retryTransient = async <T extends {error?: unknown}>(
    label: string,
    fn: () => Promise<T>,
    attempts = 4,
): Promise<T> => {
    let result: T = {error: new Error(`${label}: no attempts`)} as T;
    for (let attempt = 0; attempt < attempts; attempt++) {
        if (attempt > 0) {
            // Cloudflare 524 responses ask for ~120s backoff.
            // eslint-disable-next-line no-await-in-loop
            await wait(timeouts.ONE_MIN * 2 * attempt);
        }
        // eslint-disable-next-line no-await-in-loop
        result = await fn();
        if (!result.error) {
            return result;
        }
        if (!isTransientConfigError(result.error)) {
            break;
        }
    }
    return result;
};

export const enableClassificationMarkings = async (baseUrl: string): Promise<void> => {
    const patchResult = await retryTransient('enableClassificationMarkings patch', () =>
        System.apiPatchConfig(baseUrl, {
            FeatureFlags: {
                ClassificationMarkings: true,
            },
        }),
    );
    if (patchResult.error) {
        throw new Error(`enableClassificationMarkings: failed to patch server config: ${JSON.stringify(patchResult.error)}`);
    }

    let enabled = await System.waitForClientConfigFlag(
        baseUrl,
        'FeatureFlagClassificationMarkings',
        'true',
        {maxAttempts: 60, pollMs: timeouts.ONE_SEC},
    );
    if (!enabled) {
        const {config, error} = await System.apiGetConfig(baseUrl);
        if (error || !config) {
            throw new Error(`enableClassificationMarkings: failed to read server config: ${JSON.stringify(error)}`);
        }

        config.FeatureFlags = config.FeatureFlags ?? {};
        config.FeatureFlags.ClassificationMarkings = true;
        const replaceResult = await retryTransient('enableClassificationMarkings replace', () =>
            System.apiReplaceConfig(baseUrl, config),
        );
        if (replaceResult.error) {
            throw new Error(`enableClassificationMarkings: failed to replace server config: ${JSON.stringify(replaceResult.error)}`);
        }

        enabled = await System.waitForClientConfigFlag(
            baseUrl,
            'FeatureFlagClassificationMarkings',
            'true',
            {maxAttempts: 60, pollMs: timeouts.ONE_SEC},
        );
    }

    if (!enabled) {
        throw new Error(
            'enableClassificationMarkings: FeatureFlagClassificationMarkings did not become true; ' +
            'the server license or server configuration may block this feature flag',
        );
    }
};
