// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import System from '@support/server_api/system';
import {timeouts} from '@support/utils';
import {withTransportRetry} from '@support/utils/transport_retry';

export const enableClassificationMarkings = async (baseUrl: string): Promise<void> => {
    // Idempotent flag patch. CI cloud often drops the TCP response (axios 30s → status 0).
    const patchResult = await withTransportRetry(() => System.apiPatchConfig(baseUrl, {
        FeatureFlags: {
            ClassificationMarkings: true,
        },
    }));
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
            'enableClassificationMarkings: FeatureFlagClassificationMarkings did not become true. ' +
            'Either the server license or configuration blocks this feature flag, or another ' +
            'suite turned it off concurrently — classification suites must never unset it ' +
            '(see the invariant in global_classification_banner.e2e.ts).',
        );
    }
};
