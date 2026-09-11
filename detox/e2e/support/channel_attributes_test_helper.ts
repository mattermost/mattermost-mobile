// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import System from '@support/server_api/system';
import {timeouts} from '@support/utils';

const FLAG_PATCH_ATTEMPTS = 3;

const observedFlagValues = async (baseUrl: string) => {
    const {config: serverConfig} = await System.apiGetConfig(baseUrl);
    const {config: clientConfig} = await System.apiGetClientConfigOld(baseUrl);
    return {
        server: serverConfig?.FeatureFlags?.ChannelAttributes,
        client: clientConfig?.FeatureFlagChannelAttributes,
    };
};

/**
 * Attempt to disable the ChannelAttributes feature flag on the server.
 *
 * Returns true if the flag was successfully set to false, false if the server
 * controls the flag via an environment variable and it cannot be overridden.
 * Never throws — callers that require the flag to be off should check the return
 * value and skip or fail with a clear message.
 */
export const disableChannelAttributes = async (baseUrl: string): Promise<boolean> => {
    const patchResult = await System.apiPatchConfig(baseUrl, {
        FeatureFlags: {
            ChannelAttributes: false,
        },
    });
    if (patchResult.error) {
        return false;
    }

    let disabled = await System.waitForClientConfigFlag(
        baseUrl,
        'FeatureFlagChannelAttributes',
        'false',
        {maxAttempts: 30, pollMs: timeouts.ONE_SEC},
    );
    if (!disabled) {
        const {config, error} = await System.apiGetConfig(baseUrl);
        if (error || !config) {
            return false;
        }

        config.FeatureFlags = config.FeatureFlags ?? {};
        config.FeatureFlags.ChannelAttributes = false;
        const replaceResult = await System.apiReplaceConfig(baseUrl, config);
        if (replaceResult.error) {
            return false;
        }

        disabled = await System.waitForClientConfigFlag(
            baseUrl,
            'FeatureFlagChannelAttributes',
            'false',
            {maxAttempts: 30, pollMs: timeouts.ONE_SEC},
        );
    }

    return disabled;
};

/**
 * Attempt to enable the ChannelAttributes feature flag.
 *
 * Returns true when the client config reports the flag as true. Returns false
 * when the server license, Split, or `MM_FEATUREFLAGS_CHANNELATTRIBUTES` keeps
 * it off — callers that require the flag on should skip rather than fail the
 * whole suite. Throws only on transport / API errors.
 */
export const enableChannelAttributes = async (baseUrl: string): Promise<boolean> => {
    let lastObserved: {server?: unknown; client?: unknown} = {};

    /* eslint-disable no-await-in-loop -- sequential re-patch until client config catches up */
    for (let attempt = 1; attempt <= FLAG_PATCH_ATTEMPTS; attempt++) {
        const patchResult = await System.apiPatchConfig(baseUrl, {
            FeatureFlags: {
                ChannelAttributes: true,
            },
        });
        if (patchResult.error) {
            throw new Error(`enableChannelAttributes: failed to patch server config: ${JSON.stringify(patchResult.error)}`);
        }

        const enabled = await System.waitForClientConfigFlag(
            baseUrl,
            'FeatureFlagChannelAttributes',
            'true',
            {maxAttempts: 30, pollMs: timeouts.ONE_SEC},
        );
        if (enabled) {
            return true;
        }

        lastObserved = await observedFlagValues(baseUrl);

        // eslint-disable-next-line no-console
        console.warn(
            `[enableChannelAttributes] attempt ${attempt}/${FLAG_PATCH_ATTEMPTS} ` +
            `server=${String(lastObserved.server)} client=${String(lastObserved.client)}`,
        );
    }
    /* eslint-enable no-await-in-loop */

    // eslint-disable-next-line no-console
    console.warn(
        'enableChannelAttributes: FeatureFlagChannelAttributes did not become true. ' +
        `Last observed server=${String(lastObserved.server)} client=${String(lastObserved.client)}. ` +
        'Cloud Spinwick installations may need MM_FEATUREFLAGS_CHANNELATTRIBUTES=true in Matterwick PriorityEnv.',
    );
    return false;
};
