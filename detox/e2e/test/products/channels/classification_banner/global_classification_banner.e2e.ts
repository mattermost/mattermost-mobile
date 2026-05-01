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
import {ChannelListScreen, ChannelScreen, GlobalThreadsScreen, HomeScreen, LoginScreen, ServerScreen} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {by, device, element, expect, waitFor} from 'detox';

describe('Classification Banner - Global Classification Banner', () => {
    const serverOneDisplayName = 'Server 1';
    let testUser: any;

    beforeAll(async () => {
        // # Ensure classification feature flag is off and any existing
        //   property fields are cleaned up before login
        await System.apiPatchConfig(siteOneUrl, {
            FeatureFlags: {
                ClassificationMarkings: false,
            },
        });

        const {user} = await Setup.apiInit(siteOneUrl);
        testUser = user;

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
        await Properties.apiSetupClassificationWithBanner(siteOneUrl, {
            levelId: 'lvl-top-secret',
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
        await Properties.apiSetupClassificationWithBanner(siteOneUrl, {
            levelId: 'lvl-top-secret',
        });
        await device.reloadReactNative();

        // # Wait for channel list to load and navigate into a channel
        await ChannelListScreen.toBeVisible();
        await waitFor(element(by.id('channel_list_header.team_display_name'))).toExist().withTimeout(timeouts.TEN_SEC * 3);
        await wait(timeouts.TWO_SEC);
        await ChannelScreen.open('channels', 'town-square');

        // * Verify banner is visible in the channel screen
        await GlobalClassificationBanner.toBeVisible();

        // * Verify banner displays the level name text
        await expect(element(by.text('TOP SECRET'))).toBeVisible();

        // # Navigate back to channel list for clean state
        await ChannelScreen.back();
    });

    it('MM-T_CB_4 - should render the banner on the global threads screen when classification is configured', async () => {
        // # Enable feature flag and set up classification with banner
        await System.apiPatchConfig(siteOneUrl, {
            FeatureFlags: {
                ClassificationMarkings: true,
            },
        });
        await Properties.apiSetupClassificationWithBanner(siteOneUrl, {
            levelId: 'lvl-top-secret',
        });
        await device.reloadReactNative();

        // # Navigate to channel list and open global threads
        await ChannelListScreen.toBeVisible();
        await GlobalThreadsScreen.open();

        // * Verify banner is visible on the global threads screen
        await GlobalClassificationBanner.toBeVisible();

        // * Verify banner displays the level name text
        await expect(element(by.text('TOP SECRET'))).toBeVisible();

        // # Go back to channel list
        await GlobalThreadsScreen.back();
    });

    it('MM-T_CB_5 - should not render the banner when no classification value is set', async () => {
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

    it('MM-T_CB_6 - should persist the banner across channel navigation', async () => {
        // # Enable feature flag and set up classification
        await System.apiPatchConfig(siteOneUrl, {
            FeatureFlags: {
                ClassificationMarkings: true,
            },
        });
        await Properties.apiSetupClassificationWithBanner(siteOneUrl, {
            levelId: 'lvl-top-secret',
        });
        await device.reloadReactNative();

        // # Verify banner on channel list
        await ChannelListScreen.toBeVisible();
        await GlobalClassificationBanner.toBeVisible();
        await expect(element(by.text('TOP SECRET'))).toBeVisible();

        // # Navigate into a channel
        await waitFor(element(by.id('channel_list_header.team_display_name'))).toExist().withTimeout(timeouts.TEN_SEC * 3);
        await wait(timeouts.TWO_SEC);
        await ChannelScreen.open('channels', 'town-square');

        // * Verify banner is still visible in the channel
        await GlobalClassificationBanner.toBeVisible();
        await expect(element(by.text('TOP SECRET'))).toBeVisible();

        // # Navigate back to channel list
        await ChannelScreen.back();
        await ChannelListScreen.toBeVisible();

        // * Verify banner is still visible on channel list after returning
        await GlobalClassificationBanner.toBeVisible();
        await expect(element(by.text('TOP SECRET'))).toBeVisible();
    });

    it('MM-T_CB_7 - should update the banner when classification level changes', async () => {
        // # Enable feature flag and set up classification with TOP SECRET
        await System.apiPatchConfig(siteOneUrl, {
            FeatureFlags: {
                ClassificationMarkings: true,
            },
        });
        const {linkedFieldId} = await Properties.apiSetupClassificationWithBanner(siteOneUrl, {
            levelId: 'lvl-top-secret',
        });
        await device.reloadReactNative();

        // # Navigate to channel list
        await ChannelListScreen.toBeVisible();

        // * Verify banner displays TOP SECRET
        await GlobalClassificationBanner.toBeVisible();
        await expect(element(by.text('TOP SECRET'))).toBeVisible();

        // # Update the system property value to the SECRET level by its known ID
        await Properties.apiPatchSystemPropertyValues(siteOneUrl, 'classification_markings', [
            {field_id: linkedFieldId, value: 'lvl-secret'},
        ]);

        // # Reload to pick up the change
        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();

        // * Verify banner now displays SECRET instead of TOP SECRET
        await GlobalClassificationBanner.toBeVisible();
        await expect(element(by.text('SECRET'))).toBeVisible();
        await waitFor(element(by.text('TOP SECRET'))).not.toBeVisible().withTimeout(timeouts.FOUR_SEC);
    });

    it('MM-T_CB_8 - should remove the banner when classification configuration is deleted', async () => {
        // # Start with feature flag on and classification configured
        await System.apiPatchConfig(siteOneUrl, {
            FeatureFlags: {
                ClassificationMarkings: true,
            },
        });
        await Properties.apiSetupClassificationWithBanner(siteOneUrl, {
            levelId: 'lvl-top-secret',
        });
        await device.reloadReactNative();

        // # Navigate to channel list
        await ChannelListScreen.toBeVisible();

        // * Verify banner is visible
        await GlobalClassificationBanner.toBeVisible();
        await expect(element(by.text('TOP SECRET'))).toBeVisible();

        // # Remove classification data
        await Properties.apiCleanupClassification(siteOneUrl);
        await device.reloadReactNative();

        // # Navigate back to channel list
        await ChannelListScreen.toBeVisible();

        // * Verify banner is now gone
        await GlobalClassificationBanner.toNotBeVisible();
    });

    it('MM-T_CB_9 - should remove the banner when the feature flag is toggled off', async () => {
        // # Enable feature flag and set up classification
        await System.apiPatchConfig(siteOneUrl, {
            FeatureFlags: {
                ClassificationMarkings: true,
            },
        });
        await Properties.apiSetupClassificationWithBanner(siteOneUrl, {
            levelId: 'lvl-top-secret',
        });
        await device.reloadReactNative();

        // # Navigate to channel list
        await ChannelListScreen.toBeVisible();

        // * Verify banner is visible
        await GlobalClassificationBanner.toBeVisible();
        await expect(element(by.text('TOP SECRET'))).toBeVisible();

        // # Disable the feature flag and clean up classification
        await Properties.apiCleanupClassification(siteOneUrl);
        await System.apiPatchConfig(siteOneUrl, {
            FeatureFlags: {
                ClassificationMarkings: false,
            },
        });
        await device.reloadReactNative();

        // # Verify channel list loads
        await ChannelListScreen.toBeVisible();

        // * Verify banner is no longer visible
        await waitFor(element(by.id('global_classification_banner'))).not.toBeVisible().withTimeout(timeouts.TEN_SEC);
    });

    it('MM-T_CB_10 - should not render the banner on the channel screen when classification is removed while on channel list', async () => {
        // # Enable feature flag and set up classification
        await System.apiPatchConfig(siteOneUrl, {
            FeatureFlags: {
                ClassificationMarkings: true,
            },
        });
        await Properties.apiSetupClassificationWithBanner(siteOneUrl, {
            levelId: 'lvl-top-secret',
        });
        await device.reloadReactNative();

        // # Navigate to channel list and verify banner is visible
        await ChannelListScreen.toBeVisible();
        await GlobalClassificationBanner.toBeVisible();

        // # Remove classification while on channel list
        await Properties.apiCleanupClassification(siteOneUrl);
        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();

        // * Verify banner is gone on channel list
        await GlobalClassificationBanner.toNotBeVisible();

        // # Navigate into a channel
        await waitFor(element(by.id('channel_list_header.team_display_name'))).toExist().withTimeout(timeouts.TEN_SEC * 3);
        await wait(timeouts.TWO_SEC);
        await ChannelScreen.open('channels', 'town-square');

        // * Verify banner is also not visible on the channel screen
        await GlobalClassificationBanner.toNotBeVisible();

        // # Navigate back to channel list for clean state
        await ChannelScreen.back();
    });
});
