// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import System from '@support/server_api/system';
import {timeouts} from '@support/utils';

import {logWarn} from '../../provision/log';

const FLAG_PATCH_ATTEMPTS = 3;

const observedFlagValues = async (baseUrl: string) => {
    const {config: serverConfig} = await System.apiGetConfig(baseUrl);
    const {config: clientConfig} = await System.apiGetClientConfigOld(baseUrl);
    return {
        server: serverConfig?.FeatureFlags?.ChannelAttributes,
        client: clientConfig?.FeatureFlagChannelAttributes,
        serverRequired: serverConfig?.FeatureFlags?.ChannelAttributesRequired,
        clientRequired: clientConfig?.FeatureFlagChannelAttributesRequired,
    };
};

/**
 * Disable the ChannelAttributes flag. Returns false if no attempt was confirmed; never throws.
 */
export const disableChannelAttributes = async (baseUrl: string): Promise<boolean> => {
    let lastObserved: {server?: unknown; client?: unknown} = {};

    // Re-patch between polls like enableChannelAttributes; a single write can be dropped.
    /* eslint-disable no-await-in-loop -- sequential re-patch until client config catches up */
    for (let attempt = 1; attempt <= FLAG_PATCH_ATTEMPTS; attempt++) {
        const patchResult = await System.apiPatchFeatureFlags(baseUrl, {
            ChannelAttributes: false,
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

        // Say whether the patch was rejected or never propagated.
        const cause = patchResult.error ?
            `patch rejected: ${JSON.stringify(patchResult.error).slice(0, 200)}` :
            'patch accepted but the client config did not report false in time';

        logWarn(
            `[disableChannelAttributes] attempt ${attempt}/${FLAG_PATCH_ATTEMPTS} ${cause}; ` +
            `server=${String(lastObserved.server)} client=${String(lastObserved.client)}`,
        );
    }
    /* eslint-enable no-await-in-loop */

    return false;
};

/**
 * Attempt to enable the ChannelAttributes feature flag, together with
 * ChannelAttributesRequired. The server defaults the latter to off, and without it
 * required attributes are neither enforced by the server nor offered by the app.
 *
 * Throws when the server license, Split, or
 * `MM_FEATUREFLAGS_CHANNELATTRIBUTES` keeps it off.
 */
export const enableChannelAttributes = async (baseUrl: string): Promise<void> => {
    let lastObserved: {server?: unknown; client?: unknown; serverRequired?: unknown; clientRequired?: unknown} = {};

    /* eslint-disable no-await-in-loop -- sequential re-patch until client config catches up */
    for (let attempt = 1; attempt <= FLAG_PATCH_ATTEMPTS; attempt++) {
        const patchResult = await System.apiPatchFeatureFlags(baseUrl, {
            ChannelAttributes: true,
            ChannelAttributesRequired: true,
        });
        if (patchResult.error) {
            throw new Error(`enableChannelAttributes: failed to patch server config: ${JSON.stringify(patchResult.error)}`);
        }

        const enabled = await System.waitForClientConfigFlag(
            baseUrl,
            'FeatureFlagChannelAttributes',
            'true',
            {maxAttempts: 30, pollMs: timeouts.ONE_SEC},
        ) && await System.waitForClientConfigFlag(
            baseUrl,
            'FeatureFlagChannelAttributesRequired',
            'true',
            {maxAttempts: 30, pollMs: timeouts.ONE_SEC},
        );
        if (enabled) {
            return;
        }

        lastObserved = await observedFlagValues(baseUrl);

        logWarn(
            `[enableChannelAttributes] attempt ${attempt}/${FLAG_PATCH_ATTEMPTS} ` +
            `server=${String(lastObserved.server)} client=${String(lastObserved.client)} ` +
            `serverRequired=${String(lastObserved.serverRequired)} clientRequired=${String(lastObserved.clientRequired)}`,
        );
    }
    /* eslint-enable no-await-in-loop */

    throw new Error(
        'enableChannelAttributes: FeatureFlagChannelAttributes and FeatureFlagChannelAttributesRequired did not both become true. ' +
        `Last observed server=${String(lastObserved.server)} client=${String(lastObserved.client)} ` +
        `serverRequired=${String(lastObserved.serverRequired)} clientRequired=${String(lastObserved.clientRequired)}. ` +
        'Cloud Spinwick installations may need MM_FEATUREFLAGS_CHANNELATTRIBUTES=true and MM_FEATUREFLAGS_CHANNELATTRIBUTESREQUIRED=true in Matterwick PriorityEnv.',
    );
};
