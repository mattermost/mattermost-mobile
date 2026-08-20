// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import System from '@support/server_api/system';
import {timeouts} from '@support/utils';
import {withTransportRetry} from '@support/utils/transport_retry';

export const enableClassificationMarkings = async (baseUrl: string): Promise<void> => {
    // PATCH /config is a heavy write and the E2E servers regularly blow the client's
    // 30s ceiling under shard load. That surfaces as {error, status: 0} — a transport
    // failure, not a config rejection — and took out all 11 classification specs on
    // Android plus MM-T6204_1 on iOS in run 32232550302. Retrying is safe: setting the
    // same feature flag twice is idempotent.
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
