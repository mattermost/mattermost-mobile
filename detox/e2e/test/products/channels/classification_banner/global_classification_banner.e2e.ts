// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {acquireClassificationLock, createClassificationLockOwner, releaseClassificationLock} from '@support/classification_lock';
import {enableClassificationMarkings} from '@support/classification_test_helper';
import {Properties, Setup, System} from '@support/server_api';
import {serverOneUrl, siteOneUrl} from '@support/test_config';
import {GlobalClassificationBanner} from '@support/ui/component';
import {ChannelListScreen, ChannelScreen, GlobalThreadsScreen, HomeScreen, LoginScreen, ServerScreen} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {by, device, element, expect, waitFor} from 'detox';

// Lock wait is up to 20m; leave headroom for enable/setup after acquire.
jest.setTimeout(timeouts.ONE_MIN * 30);

// INVARIANT — ClassificationMarkings is enabled once per suite and never unset.
//
// FeatureFlags.ClassificationMarkings is server-GLOBAL config and ~10 Detox shards share
// each provisioned server (shard parity picks the server; see the "Rotate logical test
// sites by shard" step in e2e-ios-template.yml). This suite used to flip the flag ~13
// times. Concurrent even shards then collided: this suite and
// classification_banner_across_screens both landed on SERVER_B, 20 seconds apart.
// The other suite blocked ~13 minutes and then failed with
// "FeatureFlagClassificationMarkings did not become true" — it needed the flag steadily on
// while this suite was toggling it off.
//
// So: enable in beforeAll, never patch it false, and let each classification suite enable
// it idempotently under its own lock. MM-T6204_1 is the single exception (toggling off is
// the behaviour it exists to assert); it runs LAST and restores the flag before releasing.
describe('Classification Banner - Global Classification Banner', () => {
    const serverOneDisplayName = 'Server 1';
    let lockOwner = '';
    let lockAcquired = false;
    let testUser: any;

    beforeAll(async () => {
        lockOwner = createClassificationLockOwner();
        await acquireClassificationLock(siteOneUrl, lockOwner);
        lockAcquired = true;

        // Enable once for the whole suite. Individual tests must not re-enable or unset it.
        await enableClassificationMarkings(siteOneUrl);

        const {user} = await Setup.apiInit(siteOneUrl);
        testUser = user;

        await Properties.apiCleanupClassification(siteOneUrl);

        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    afterAll(async () => {
        // Never tear down shared server state we do not own — see the same guard in
        // classification_banner_across_screens.e2e.ts.
        if (!lockAcquired) {
            return;
        }

        try {
            // Clean up the classification config (per-suite state) but leave the feature
            // flag enabled — see the suite invariant above.
            await Properties.apiCleanupClassification(siteOneUrl);

            await HomeScreen.logout();
        } finally {
            await releaseClassificationLock(siteOneUrl, lockOwner);
        }
    });

    afterEach(async () => {
        // Same ownership guard as afterAll: jest-circus still runs afterEach for each
        // test it marks failed after a beforeAll failure, so a shard that never acquired
        // the lock would delete the classification config of the shard that did.
        if (!lockAcquired) {
            return;
        }

        await Properties.apiCleanupClassification(siteOneUrl);
    });

    it('MM-T6197_1 - should render the banner on the channel list screen when classification is configured', async () => {
        await Properties.apiSetupClassificationWithBanner(siteOneUrl, {
            levelId: 'lvltopsecret00000000000000',
            user: testUser,
        });
        await device.reloadReactNative();

        await ChannelListScreen.toBeVisible();

        await GlobalClassificationBanner.toBeVisible();

        await expect(element(by.text('TOP SECRET'))).toBeVisible();
    });

    it('MM-T6198_1 - should render the banner on the channel screen when classification is configured', async () => {
        await Properties.apiSetupClassificationWithBanner(siteOneUrl, {
            levelId: 'lvltopsecret00000000000000',
            user: testUser,
        });
        await device.reloadReactNative();

        await ChannelListScreen.toBeVisible();
        await waitFor(element(by.id('channel_list_header.team_display_name'))).toExist().withTimeout(timeouts.TEN_SEC * 3);
        await wait(timeouts.TWO_SEC);
        await ChannelScreen.open('channels', 'town-square');

        await GlobalClassificationBanner.toBeVisible();

        await expect(element(by.text('TOP SECRET'))).toBeVisible();

        await ChannelScreen.back();
    });

    it('MM-T6199_1 - should render the banner on the global threads screen when classification is configured', async () => {
        await Properties.apiSetupClassificationWithBanner(siteOneUrl, {
            levelId: 'lvltopsecret00000000000000',
            user: testUser,
        });
        await device.reloadReactNative();

        await ChannelListScreen.toBeVisible();
        await GlobalThreadsScreen.open();

        await GlobalClassificationBanner.toBeVisible();

        await expect(element(by.text('TOP SECRET'))).toBeVisible();

        await GlobalThreadsScreen.back();
    });

    it('MM-T6200_1 - should not render the banner when no classification value is set', async () => {
        await device.reloadReactNative();

        await ChannelListScreen.toBeVisible();

        await GlobalClassificationBanner.toNotBeVisible();
    });

    it('MM-T6201_1 - should persist the banner across channel navigation', async () => {
        await Properties.apiSetupClassificationWithBanner(siteOneUrl, {
            levelId: 'lvltopsecret00000000000000',
            user: testUser,
        });
        await device.reloadReactNative();

        await ChannelListScreen.toBeVisible();
        await GlobalClassificationBanner.toBeVisible();
        await expect(element(by.text('TOP SECRET'))).toBeVisible();

        await waitFor(element(by.id('channel_list_header.team_display_name'))).toExist().withTimeout(timeouts.TEN_SEC * 3);
        await wait(timeouts.TWO_SEC);
        await ChannelScreen.open('channels', 'town-square');

        await GlobalClassificationBanner.toBeVisible();
        await expect(element(by.text('TOP SECRET'))).toBeVisible();

        await ChannelScreen.back();
        await ChannelListScreen.toBeVisible();

        await GlobalClassificationBanner.toBeVisible();
        await expect(element(by.text('TOP SECRET'))).toBeVisible();
    });

    it('MM-T6202_1 - should update the banner when classification level changes', async () => {
        const {linkedFieldId, optionIdsByName} = await Properties.apiSetupClassificationWithBanner(siteOneUrl, {
            levelId: 'lvltopsecret00000000000000',
            user: testUser,
        });
        const secretOptionId = optionIdsByName.SECRET;
        if (!secretOptionId) {
            throw new Error(`SECRET option id missing from setup. Available: ${Object.keys(optionIdsByName).join(', ')}`);
        }
        await device.reloadReactNative();

        await ChannelListScreen.toBeVisible();

        await GlobalClassificationBanner.toBeVisible();
        await expect(element(by.text('TOP SECRET'))).toBeVisible();

        await Properties.apiPatchSystemPropertyValues(siteOneUrl, 'access_control', [
            {field_id: linkedFieldId, value: secretOptionId},
        ]);

        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();

        await GlobalClassificationBanner.toBeVisible();
        await expect(element(by.text('SECRET'))).toBeVisible();
        await waitFor(element(by.text('TOP SECRET'))).not.toBeVisible().withTimeout(timeouts.FOUR_SEC);
    });

    it('MM-T6203_1 - should remove the banner when classification configuration is deleted', async () => {
        await Properties.apiSetupClassificationWithBanner(siteOneUrl, {
            levelId: 'lvltopsecret00000000000000',
            user: testUser,
        });
        await device.reloadReactNative();

        await ChannelListScreen.toBeVisible();

        await GlobalClassificationBanner.toBeVisible();
        await expect(element(by.text('TOP SECRET'))).toBeVisible();

        await Properties.apiCleanupClassification(siteOneUrl);
        await device.reloadReactNative();

        await ChannelListScreen.toBeVisible();

        await GlobalClassificationBanner.toNotBeVisible();
    });

    it('MM-T6205_1 - should not render the banner on the channel screen when classification is removed while on channel list', async () => {
        await Properties.apiSetupClassificationWithBanner(siteOneUrl, {
            levelId: 'lvltopsecret00000000000000',
            user: testUser,
        });
        await device.reloadReactNative();

        await ChannelListScreen.toBeVisible();

        // The reload-and-retry that used to guard this assertion is gone with its cause:
        // it only existed because MM-T6204_1 turned ClassificationMarkings off immediately
        // before this test, so the first reload could race the client config catching up on
        // re-enable. MM-T6204_1 now runs last and the flag is never off here.
        await GlobalClassificationBanner.toBeVisible();

        await Properties.apiCleanupClassification(siteOneUrl);
        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();

        await GlobalClassificationBanner.toNotBeVisible();

        await waitFor(element(by.id('channel_list_header.team_display_name'))).toExist().withTimeout(timeouts.TEN_SEC * 3);
        await wait(timeouts.TWO_SEC);
        await ChannelScreen.open('channels', 'town-square');

        await GlobalClassificationBanner.toNotBeVisible();

        await ChannelScreen.back();
    });

    // LAST TEST BY DESIGN. This is the only place the suite unsets the shared
    // ClassificationMarkings flag, because toggling it off is the behaviour under test.
    // Running last means no sibling test in this file needs the flag on afterwards, and the
    // flag is restored below before afterAll releases the lock — so the window in which a
    // concurrent suite could observe it off is confined to this test, under the lock.
    it('MM-T6204_1 - should remove the banner when the feature flag is toggled off', async () => {
        await Properties.apiSetupClassificationWithBanner(siteOneUrl, {
            levelId: 'lvltopsecret00000000000000',
            user: testUser,
        });
        await device.reloadReactNative();

        await ChannelListScreen.toBeVisible();

        await GlobalClassificationBanner.toBeVisible();
        await expect(element(by.text('TOP SECRET'))).toBeVisible();

        await Properties.apiCleanupClassification(siteOneUrl);
        await System.apiPatchConfig(siteOneUrl, {
            FeatureFlags: {
                ClassificationMarkings: false,
            },
        });
        await device.reloadReactNative();

        await ChannelListScreen.toBeVisible();

        await waitFor(element(by.id('global_classification_banner'))).not.toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Restore the suite invariant while still holding the lock, so the server is left
        // with the flag enabled for whichever suite runs next on it.
        await enableClassificationMarkings(siteOneUrl);
    });
});
