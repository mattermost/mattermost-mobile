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
    let lastObserved: {server?: unknown; client?: unknown} = {};

    // Re-patch between polls, the way enableChannelAttributes does. Disabling used to patch
    // once and then wait, so a server that dropped or was slow to propagate that single write
    // made this return false — the same answer it gives when the installation owns the flag,
    // even though a second patch would have taken. Both directions now get the same budget.
    /* eslint-disable no-await-in-loop -- sequential re-patch until client config catches up */
    for (let attempt = 1; attempt <= FLAG_PATCH_ATTEMPTS; attempt++) {
        const patchResult = await System.apiPatchConfig(baseUrl, {
            FeatureFlags: {
                ChannelAttributes: false,
            },
        });

        // No full-config fallback: a GET-modify-PUT of the whole config reverts every setting
        // another shard changed since the GET, on a server ~10 shards share.
        if (!patchResult.error) {
            const disabled = await System.waitForClientConfigFlag(
                baseUrl,
                'FeatureFlagChannelAttributes',
                'false',
                {maxAttempts: 30, pollMs: timeouts.ONE_SEC},
            );
            if (disabled) {
                return true;
            }
        }

        lastObserved = await observedFlagValues(baseUrl);

        // eslint-disable-next-line no-console
        console.warn(
            `[disableChannelAttributes] attempt ${attempt}/${FLAG_PATCH_ATTEMPTS} ` +
            `server=${String(lastObserved.server)} client=${String(lastObserved.client)}`,
        );
    }
    /* eslint-enable no-await-in-loop */

    return false;
};

/**
 * Attempt to enable the ChannelAttributes feature flag.
 *
 * Throws when the server license, Split, or
 * `MM_FEATUREFLAGS_CHANNELATTRIBUTES` keeps it off.
 */
export const enableChannelAttributes = async (baseUrl: string): Promise<void> => {
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
            return;
        }

        lastObserved = await observedFlagValues(baseUrl);

        // eslint-disable-next-line no-console
        console.warn(
            `[enableChannelAttributes] attempt ${attempt}/${FLAG_PATCH_ATTEMPTS} ` +
            `server=${String(lastObserved.server)} client=${String(lastObserved.client)}`,
        );
    }
    /* eslint-enable no-await-in-loop */

    throw new Error(
        'enableChannelAttributes: FeatureFlagChannelAttributes did not become true. ' +
        `Last observed server=${String(lastObserved.server)} client=${String(lastObserved.client)}. ` +
        'Cloud Spinwick installations may need MM_FEATUREFLAGS_CHANNELATTRIBUTES=true in Matterwick PriorityEnv.',
    );
};
