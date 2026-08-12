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

    // No apiReplaceConfig fallback here. apiReplaceConfig is a full PUT /api/v4/config:
    // it reads the entire config, edits one flag, and writes the whole document back,
    // silently reverting any setting another spec changed in between. Six specs call
    // apiPatchConfig (the three classification suites plus
    // share_with_connected_workspaces, mm_blocks_ephemeral and mm_blocks_incoming_webhook)
    // and ~10 shards share each provisioned server, so that read-modify-write clobbers
    // unrelated suites. It only ever ran when the patch above had already failed, so it
    // traded a visible failure for an invisible one elsewhere.
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
