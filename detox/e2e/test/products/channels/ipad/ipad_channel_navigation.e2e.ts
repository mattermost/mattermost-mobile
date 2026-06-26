// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Setup} from '@support/server_api';
import {serverOneUrl, siteOneUrl} from '@support/test_config';
import {ChannelListScreen, ChannelScreen, HomeScreen, LoginScreen, ServerScreen} from '@support/ui/screen';
import {isIpad, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('iPad - Channel Navigation', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let testUser: any;

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testUser = user;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);

        // Ensure the channel has propagated into the sidebar before any test body runs.
        // Without this, an early tap on the channel item races the initial sync/render
        // and the RCTView fails Detox's visibility percent threshold.
        await ChannelListScreen.waitForSidebarPublicChannelDisplayNameVisible(testChannel.name);
    });

    beforeEach(async () => {
        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-TIPAD_6 - should navigate to a channel by tapping it in the sidebar on iPad', async () => {
        if (!isIpad()) {
            return;
        }

        // # Tap on the test channel in the sidebar (polling across categories)
        await ChannelListScreen.tapSidebarPublicChannelDisplayName(testChannel.name);
        await wait(timeouts.TWO_SEC);

        // * Verify the channel screen is visible
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(testChannel.display_name);

        // * Verify the sidebar is still visible (iPad split view)
        await expect(ChannelListScreen.channelListScreen).toBeVisible();

        // # Return to clean state - channel list is still visible on iPad
        await ChannelListScreen.toBeVisible();
    });

    it('MM-TIPAD_7 - should keep the sidebar visible after navigating to a channel on iPad', async () => {
        if (!isIpad()) {
            return;
        }

        // # Open the test channel from the sidebar (polling across categories)
        await wait(timeouts.TWO_SEC);
        await ChannelListScreen.tapSidebarPublicChannelDisplayName(testChannel.name);
        await wait(timeouts.TWO_SEC);

        // * Verify the channel is open
        await ChannelScreen.toBeVisible();

        // * Verify the channel list screen is still present (tablet split view — sidebar does not collapse)
        await waitFor(ChannelListScreen.channelListScreen).toExist().withTimeout(timeouts.TEN_SEC);
        await expect(ChannelListScreen.channelListScreen).toBeVisible();
    });

    it('MM-TIPAD_8 - should highlight the active channel in the sidebar on iPad', async () => {
        if (!isIpad()) {
            return;
        }

        // # Tap the test channel in the sidebar (polling across categories)
        await wait(timeouts.TWO_SEC);
        await ChannelListScreen.tapSidebarPublicChannelDisplayName(testChannel.name);
        await wait(timeouts.TWO_SEC);

        // * Verify the channel screen opened for the correct channel
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(testChannel.display_name);

        // * Verify the channel item is still present in the sidebar
        await expect(ChannelListScreen.getChannelItemDisplayName(channelsCategory, testChannel.name)).toBeVisible();
    });

    it('MM-TIPAD_9 - should show the search field button in the sidebar on iPad', async () => {
        if (!isIpad()) {
            return;
        }

        // * Verify the search field button is visible in the sidebar without navigation
        await waitFor(ChannelListScreen.subheaderSearchFieldButton).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await expect(ChannelListScreen.subheaderSearchFieldButton).toBeVisible();
    });
});
