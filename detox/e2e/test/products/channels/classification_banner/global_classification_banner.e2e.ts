// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Properties, Setup, System} from '@support/server_api';
import {serverOneUrl, siteOneUrl} from '@support/test_config';
import {GlobalClassificationBanner} from '@support/ui/component';
import {ChannelListScreen, ChannelScreen, HomeScreen, LoginScreen, ServerScreen} from '@support/ui/screen';
import {timeouts} from '@support/utils';
import {by, device, element, expect, waitFor} from 'detox';

describe('Classification Banner - Global Classification Banner', () => {
    const serverOneDisplayName = 'Server 1';
    let testUser: any;
    let testChannel: any;

    beforeAll(async () => {
        // # Ensure classification feature flag is off and any existing
        //   property fields are cleaned up before login
        await System.apiPatchConfig(siteOneUrl, {
            FeatureFlags: {
                ClassificationMarkings: false,
            },
        });

        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testUser = user;
        testChannel = channel;

        // Clean up any pre-existing classification property fields
        await Properties.apiCleanupClassification(siteOneUrl);

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    afterAll(async () => {
        // # Clean up classification data and disable feature flag
        await Properties.apiCleanupClassification(siteOneUrl);
        await System.apiPatchConfig(siteOneUrl, {
            FeatureFlags: {
                ClassificationMarkings: false,
            },
        });

        // # Log out
        await HomeScreen.logout();
    });

    afterEach(async () => {
        // Clean up classification fields between tests
        await Properties.apiCleanupClassification(siteOneUrl);
    });

    it('MM-T_CB_1 - should not render the banner when the feature flag is off', async () => {
        // # Set up classification data but keep feature flag off
        await System.apiPatchConfig(siteOneUrl, {
            FeatureFlags: {
                ClassificationMarkings: false,
            },
        });
        await device.reloadReactNative();

        // # Navigate to channel list
        await ChannelListScreen.toBeVisible();

        // * Verify banner is not visible
        await GlobalClassificationBanner.toNotBeVisible();
    });

    it('MM-T_CB_2 - should render the banner on the channel list screen when classification is configured', async () => {
        // # Enable feature flag and set up classification with banner
        await System.apiPatchConfig(siteOneUrl, {
            FeatureFlags: {
                ClassificationMarkings: true,
            },
        });
        await Properties.apiSetupClassificationWithBanner(siteOneUrl, testUser.id, {
            levelName: 'TOP SECRET',
        });
        await device.reloadReactNative();

        // # Navigate to channel list
        await ChannelListScreen.toBeVisible();

        // * Verify banner is visible
        await GlobalClassificationBanner.toBeVisible();

        // * Verify banner displays the level name text
        await expect(element(by.text('TOP SECRET'))).toBeVisible();
    });

    it('MM-T_CB_3 - should render the banner on the channel screen when classification is configured', async () => {
        // # Enable feature flag and set up classification with banner
        await System.apiPatchConfig(siteOneUrl, {
            FeatureFlags: {
                ClassificationMarkings: true,
            },
        });
        await Properties.apiSetupClassificationWithBanner(siteOneUrl, testUser.id, {
            levelName: 'TOP SECRET',
        });
        await device.reloadReactNative();

        // # Navigate into a channel
        await ChannelListScreen.toBeVisible();
        await waitFor(element(by.text(testChannel.display_name))).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await element(by.text(testChannel.display_name)).tap();
        await ChannelScreen.toBeVisible();

        // * Verify banner is visible in the channel screen
        await GlobalClassificationBanner.toBeVisible();
    });

    it('MM-T_CB_4 - should not render the banner when no classification value is set', async () => {
        // # Enable feature flag but don't set up any classification
        await System.apiPatchConfig(siteOneUrl, {
            FeatureFlags: {
                ClassificationMarkings: true,
            },
        });
        await device.reloadReactNative();

        // # Navigate to channel list
        await ChannelListScreen.toBeVisible();

        // * Verify banner is not visible
        await GlobalClassificationBanner.toNotBeVisible();
    });

    it('MM-T_CB_5 - should update the banner dynamically when classification is configured then removed', async () => {
        // # Start with feature flag on and classification configured
        await System.apiPatchConfig(siteOneUrl, {
            FeatureFlags: {
                ClassificationMarkings: true,
            },
        });
        await Properties.apiSetupClassificationWithBanner(siteOneUrl, testUser.id, {
            levelName: 'TOP SECRET',
        });
        await device.reloadReactNative();

        // # Navigate to channel list
        await ChannelListScreen.toBeVisible();

        // * Verify banner is visible
        await GlobalClassificationBanner.toBeVisible();

        // # Remove classification data
        await Properties.apiCleanupClassification(siteOneUrl);
        await device.reloadReactNative();

        // # Navigate back to channel list
        await ChannelListScreen.toBeVisible();

        // * Verify banner is now gone
        await GlobalClassificationBanner.toNotBeVisible();
    });
});
