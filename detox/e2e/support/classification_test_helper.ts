// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import System from '@support/server_api/system';
import {timeouts} from '@support/utils';

const FLAG_PATCH_ATTEMPTS = 3;
const FLAG_KEY = 'FeatureFlagClassificationMarkings';

const observedFlagValues = async (baseUrl: string) => {
    const {config: serverConfig} = await System.apiGetConfig(baseUrl);
    const {config: clientConfig} = await System.apiGetClientConfigOld(baseUrl);
    return {
        server: serverConfig?.FeatureFlags?.ClassificationMarkings,
        client: clientConfig?.[FLAG_KEY],
    };
};

// The one definition of "the flag is live": what the app reads. A single read when
// maxAttempts is 1, otherwise the propagation poll the success path has always used.
const clientFlagIsTrue = (baseUrl: string, maxAttempts = 30): Promise<boolean> => {
    return System.waitForClientConfigFlag(baseUrl, FLAG_KEY, 'true', {maxAttempts, pollMs: timeouts.ONE_SEC});
};

export const enableClassificationMarkings = async (baseUrl: string): Promise<void> => {
    // Read before write. Every caller holds the classification lock, so nothing else flips
    // the flag while this runs; if the client config already reports it on there is nothing
    // to patch. A config PATCH is a global write that reloads server config, and the second
    // classification suite to land on a server used to pay for one anyway.
    if (await clientFlagIsTrue(baseUrl, 1)) {
        return;
    }

    // Idempotent flag patch. CI cloud often drops the TCP response (axios 30s → status 0).
    let lastObserved: {server?: unknown; client?: unknown} = {};

    /* eslint-disable no-await-in-loop -- sequential re-patch until client config catches up */
    for (let attempt = 1; attempt <= FLAG_PATCH_ATTEMPTS; attempt++) {
        // No transport-retry wrapper here: apiPatchConfig already retries the patch
        // internally, and this loop re-patches on top of that. Stacking a third layer
        // is what let a single stalled request consume a whole 300s hook budget.
        const patchResult = await System.apiPatchConfig(baseUrl, {
            FeatureFlags: {
                ClassificationMarkings: true,
            },
        });
        if (patchResult.error) {
            // A dropped response is not a dropped write. In run 34487859024 the transport
            // layer spent its whole budget (3 × 45 s) waiting for this PATCH's reply on a
            // server that answered every other shard, and the old code threw here without
            // ever asking whether the flag had actually been set. Check the state the tests
            // depend on instead of trusting the HTTP reply. Deliberately no further patch on
            // this path: another 139 s is the stacking the comment above warns about.
            if (await clientFlagIsTrue(baseUrl)) {
                return;
            }
            throw new Error(
                'enableClassificationMarkings: config PATCH got no usable response ' +
                `(${JSON.stringify(patchResult.error)}) and ${FLAG_KEY} did not read true afterwards. ` +
                'The server is not accepting config writes from this shard.',
            );
        }

        const enabled = await clientFlagIsTrue(baseUrl);
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
