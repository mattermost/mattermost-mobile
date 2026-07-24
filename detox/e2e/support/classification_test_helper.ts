// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import System from '@support/server_api/system';
import {timeouts} from '@support/utils';

export const enableClassificationMarkings = async (baseUrl: string): Promise<void> => {
    const patchResult = await System.apiPatchConfig(baseUrl, {
        FeatureFlags: {
            ClassificationMarkings: true,
        },
    });
    if (patchResult.error) {
        throw new Error(`enableClassificationMarkings: failed to patch server config: ${JSON.stringify(patchResult.error)}`);
    }

    const enabled = await System.waitForClientConfigFlag(
        baseUrl,
        'FeatureFlagClassificationMarkings',
        'true',
        {maxAttempts: 60, pollMs: timeouts.ONE_SEC},
    );
    if (!enabled) {
        throw new Error(
            'enableClassificationMarkings: FeatureFlagClassificationMarkings did not become true; ' +
            'the server license or server configuration may block this feature flag',
        );
    }
};
