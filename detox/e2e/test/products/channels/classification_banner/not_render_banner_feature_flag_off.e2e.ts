// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {acquireClassificationLock, createClassificationLockOwner, releaseClassificationLock} from '@support/classification_lock';
import {Properties, Setup, System} from '@support/server_api';
import {serverOneUrl, siteOneUrl} from '@support/test_config';
import {GlobalClassificationBanner} from '@support/ui/component';
import {ChannelListScreen, HomeScreen, LoginScreen, ServerScreen} from '@support/ui/screen';
import {timeouts} from '@support/utils';
import {device} from 'detox';

// Lock wait is up to 5m; jest timeout matches the classification lock budget.
jest.setTimeout(timeouts.ONE_MIN * 5);

describe('Classification Banner - Global Classification Banner', () => {

    const serverOneDisplayName = 'Server 1';
    let lockOwner = '';
    let testUser: any;

    beforeAll(async () => {
        lockOwner = createClassificationLockOwner();
        await acquireClassificationLock(siteOneUrl, lockOwner);

        const {user} = await Setup.apiInit(siteOneUrl);
        testUser = user;

        await Properties.apiCleanupClassification(siteOneUrl);

        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    afterAll(async () => {
        try {
            await Properties.apiCleanupClassification(siteOneUrl);
            await System.apiPatchConfig(siteOneUrl, {
                FeatureFlags: {
                    ClassificationMarkings: true,
                },
            });

            await HomeScreen.logout();
        } finally {
            await releaseClassificationLock(siteOneUrl, lockOwner);
        }
    });

    afterEach(async () => {
        await Properties.apiCleanupClassification(siteOneUrl);
    });

    it('MM-T6196_1 - should not render the banner when the feature flag is off', async () => {
        await System.apiPatchConfig(siteOneUrl, {
            FeatureFlags: {
                ClassificationMarkings: false,
            },
        });
        await device.reloadReactNative();

        await ChannelListScreen.toBeVisible();

        await GlobalClassificationBanner.toNotBeVisible();

        // Restore shared-server default before releasing the classification lock.
        await System.apiPatchConfig(siteOneUrl, {
            FeatureFlags: {
                ClassificationMarkings: true,
            },
        });
    });
});
