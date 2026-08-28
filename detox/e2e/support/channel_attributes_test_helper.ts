// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import System from '@support/server_api/system';
import {timeouts} from '@support/utils';

export const enableChannelAttributes = async (baseUrl: string): Promise<void> => {
    const patchResult = await System.apiPatchConfig(baseUrl, {
        FeatureFlags: {
            ChannelAttributes: true,
        },
    });
    if (patchResult.error) {
        throw new Error(`enableChannelAttributes: failed to patch server config: ${JSON.stringify(patchResult.error)}`);
    }

    let enabled = await System.waitForClientConfigFlag(
        baseUrl,
        'FeatureFlagChannelAttributes',
        'true',
        {maxAttempts: 60, pollMs: timeouts.ONE_SEC},
    );
    if (!enabled) {
        const {config, error} = await System.apiGetConfig(baseUrl);
        if (error || !config) {
            throw new Error(`enableChannelAttributes: failed to read server config: ${JSON.stringify(error)}`);
        }

        config.FeatureFlags = config.FeatureFlags ?? {};
        config.FeatureFlags.ChannelAttributes = true;
        const replaceResult = await System.apiReplaceConfig(baseUrl, config);
        if (replaceResult.error) {
            throw new Error(`enableChannelAttributes: failed to replace server config: ${JSON.stringify(replaceResult.error)}`);
        }

        enabled = await System.waitForClientConfigFlag(
            baseUrl,
            'FeatureFlagChannelAttributes',
            'true',
            {maxAttempts: 60, pollMs: timeouts.ONE_SEC},
        );
    }

    if (!enabled) {
        throw new Error(
            'enableChannelAttributes: FeatureFlagChannelAttributes did not become true; ' +
            'the server license or server configuration may block this feature flag',
        );
    }
};
