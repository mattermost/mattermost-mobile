// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {siteTwoUrl} from '@support/test_config';
import {
    ChannelScreen,
    ChannelListScreen,
    CreateOrEditChannelScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
    ChannelInfoScreen,
    ChannelSettingsScreen,
} from '@support/ui/screen';
import {getAdminAccount, getRandomId, timeouts} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Channels - Convert to Private Channel', () => {
    const siteOneDisplayName = 'Server 1';

    beforeAll(async () => {
        // # Ensure a clean app state regardless of what the previous suite left behind.
        // Disable Detox synchronization during app init: after newInstance the JS bridge
        // (mqt_js) is busy bootstrapping React Native, causing BridgeIdlingResource to
        // block indefinitely and LoginScreen.toBeVisible() to time out on Android CI.
        await device.launchApp({newInstance: true, launchArgs: {detoxDisableSynchronization: 'YES'}});

        // # Log in to server as admin
        await ServerScreen.connectToServer(siteTwoUrl, siteOneDisplayName);
        await LoginScreen.loginAsAdmin(getAdminAccount());

        // Re-enable synchronization now that the app has settled past the init bridge burst.
        await device.enableSynchronization();

        // Wait for the channel list header plus button to be fully visible and hittable
        // before any test attempts to tap it. A fixed TWO_SEC sleep was insufficient on
        // iOS/Android CI where the navigation animation can take longer after relaunch.
        await waitFor(ChannelListScreen.headerPlusButton).toBeVisible().withTimeout(timeouts.HALF_MIN);
    });

    beforeEach(async () => {
        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T4972_1 - should be able to convert public channel to private and confirm', async () => {
        // # Create a public channel screen, open channel info screen, go to channel settings, and tap on convert to private channel option and confirm
        const channelDisplayName = `Channel ${getRandomId()}`;
        await CreateOrEditChannelScreen.openCreateChannel();
        await CreateOrEditChannelScreen.displayNameInput.replaceText(channelDisplayName);
        await CreateOrEditChannelScreen.createButton.tap();
        await ChannelScreen.dismissScheduledPostTooltip();
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.openChannelSettings();
        await ChannelSettingsScreen.toBeVisible();
        await ChannelSettingsScreen.convertToPrivateChannel(channelDisplayName, {confirm: true});

        // * Verify on channel settings screen and convert to private channel option does not exist
        await ChannelSettingsScreen.toBeVisible();
        await expect(ChannelSettingsScreen.convertPrivateOption).not.toExist();

        // # Go back to channel list screen
        await ChannelSettingsScreen.close();
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T4972_2 - should be able to convert public channel to private and cancel', async () => {
        // # Create a public channel screen, open channel info screen, go to channel settings, and tap on convert to private channel option and cancel
        const channelDisplayName = `Channel ${getRandomId()}`;
        await CreateOrEditChannelScreen.openCreateChannel();
        await CreateOrEditChannelScreen.displayNameInput.replaceText(channelDisplayName);
        await CreateOrEditChannelScreen.createButton.tap();
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.openChannelSettings();
        await ChannelSettingsScreen.toBeVisible();
        await ChannelSettingsScreen.convertToPrivateChannel(channelDisplayName, {confirm: false});

        // * Verify on channel settings screen and convert to private channel option still exists
        await ChannelSettingsScreen.toBeVisible();
        await expect(ChannelSettingsScreen.convertPrivateOption).toExist();

        // # Go back to channel list screen
        await ChannelSettingsScreen.close();
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });
});
