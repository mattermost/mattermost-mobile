// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import System from '@support/server_api/system';
import {timeouts} from '@support/utils';
import {withTransportRetry} from '@support/utils/transport_retry';

const FLAG_PATCH_ATTEMPTS = 3;

const observedFlagValues = async (baseUrl: string) => {
    const {config: serverConfig} = await System.apiGetConfig(baseUrl);
    const {config: clientConfig} = await System.apiGetClientConfigOld(baseUrl);
    return {
        server: serverConfig?.FeatureFlags?.ClassificationMarkings,
        client: clientConfig?.FeatureFlagClassificationMarkings,
    };
};

export const enableClassificationMarkings = async (baseUrl: string): Promise<void> => {
    // Idempotent flag patch. CI cloud often drops the TCP response (axios 30s → status 0).
    // Re-patch if client config lags after a sibling suite turned the flag off (MM-T6204_1).
    let lastObserved: {server?: unknown; client?: unknown} = {};

    /* eslint-disable no-await-in-loop -- sequential re-patch until client config catches up */
    for (let attempt = 1; attempt <= FLAG_PATCH_ATTEMPTS; attempt++) {
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
            {maxAttempts: 30, pollMs: timeouts.ONE_SEC},
        );
        if (enabled) {
            return;
        }

        lastObserved = await observedFlagValues(baseUrl);
        // eslint-disable-next-line no-console
        console.warn(
            `[enableClassificationMarkings] attempt ${attempt}/${FLAG_PATCH_ATTEMPTS} ` +
            `server=${String(lastObserved.server)} client=${String(lastObserved.client)}`,
        );
    }
    /* eslint-enable no-await-in-loop */

    throw new Error(
        'enableClassificationMarkings: FeatureFlagClassificationMarkings did not become true. ' +
        `Last observed server=${String(lastObserved.server)} client=${String(lastObserved.client)}. ` +
        'Either the server license or configuration blocks this feature flag, or another ' +
        'suite turned it off concurrently — classification suites must never unset it ' +
        '(see the invariant in global_classification_banner.e2e.ts).',
    );
};
