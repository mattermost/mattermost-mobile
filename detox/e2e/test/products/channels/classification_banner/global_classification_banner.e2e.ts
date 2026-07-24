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

describe('Classification Banner - Global Classification Banner', () => {
    const serverOneDisplayName = 'Server 1';
    let lockOwner = '';
    let testUser: any;

    beforeAll(async () => {
        lockOwner = createClassificationLockOwner();
        await acquireClassificationLock(siteOneUrl, lockOwner);

        await System.apiPatchConfig(siteOneUrl, {
            FeatureFlags: {
                ClassificationMarkings: false,
            },
        });

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
                    ClassificationMarkings: false,
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
    });

    it('MM-T6197_1 - should render the banner on the channel list screen when classification is configured', async () => {
        await enableClassificationMarkings(siteOneUrl);
        await Properties.apiSetupClassificationWithBanner(siteOneUrl, {
            levelId: 'lvltopsecret00000000000000'});
        await device.reloadReactNative();

        await ChannelListScreen.toBeVisible();

        await GlobalClassificationBanner.toBeVisible();

        await expect(element(by.text('TOP SECRET'))).toBeVisible();
    });

    it('MM-T6198_1 - should render the banner on the channel screen when classification is configured', async () => {
        await enableClassificationMarkings(siteOneUrl);
        await Properties.apiSetupClassificationWithBanner(siteOneUrl, {
            levelId: 'lvltopsecret00000000000000'});
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
        await enableClassificationMarkings(siteOneUrl);
        await Properties.apiSetupClassificationWithBanner(siteOneUrl, {
            levelId: 'lvltopsecret00000000000000'});
        await device.reloadReactNative();

        await ChannelListScreen.toBeVisible();
        await GlobalThreadsScreen.open();

        await GlobalClassificationBanner.toBeVisible();

        await expect(element(by.text('TOP SECRET'))).toBeVisible();

        await GlobalThreadsScreen.back();
    });

    it('MM-T6200_1 - should not render the banner when no classification value is set', async () => {
        await enableClassificationMarkings(siteOneUrl);
        await device.reloadReactNative();

        await ChannelListScreen.toBeVisible();

        await GlobalClassificationBanner.toNotBeVisible();
    });

    it('MM-T6201_1 - should persist the banner across channel navigation', async () => {
        await enableClassificationMarkings(siteOneUrl);
        await Properties.apiSetupClassificationWithBanner(siteOneUrl, {
            levelId: 'lvltopsecret00000000000000'});
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
        await enableClassificationMarkings(siteOneUrl);
        const {linkedFieldId, optionIdsByName} = await Properties.apiSetupClassificationWithBanner(siteOneUrl, {
            levelId: 'lvltopsecret00000000000000'});
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
        await enableClassificationMarkings(siteOneUrl);
        await Properties.apiSetupClassificationWithBanner(siteOneUrl, {
            levelId: 'lvltopsecret00000000000000'});
        await device.reloadReactNative();

        await ChannelListScreen.toBeVisible();

        await GlobalClassificationBanner.toBeVisible();
        await expect(element(by.text('TOP SECRET'))).toBeVisible();

        await Properties.apiCleanupClassification(siteOneUrl);
        await device.reloadReactNative();

        await ChannelListScreen.toBeVisible();

        await GlobalClassificationBanner.toNotBeVisible();
    });

    it('MM-T6204_1 - should remove the banner when the feature flag is toggled off', async () => {
        await enableClassificationMarkings(siteOneUrl);
        await Properties.apiSetupClassificationWithBanner(siteOneUrl, {
            levelId: 'lvltopsecret00000000000000'});
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
    });

    it('MM-T6205_1 - should not render the banner on the channel screen when classification is removed while on channel list', async () => {
        await enableClassificationMarkings(siteOneUrl);
        await Properties.apiSetupClassificationWithBanner(siteOneUrl, {
            levelId: 'lvltopsecret00000000000000'});
        await device.reloadReactNative();

        await ChannelListScreen.toBeVisible();
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
});
