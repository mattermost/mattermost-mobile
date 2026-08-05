// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    Channel,
    Setup,
    System,
    Team,
    User,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {Alert} from '@support/ui/component';
import {
    BrowseChannelsScreen,
    ChannelDropdownMenuScreen,
    ChannelScreen,
    ChannelListScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {isAndroid, timeouts, wait, waitForElementToExist} from '@support/utils';
import {expect, waitFor} from 'detox';

// Several tests here call device.reloadReactNative(), which can take 30-90s on iOS CI.
jest.setTimeout(360000);

describe('Channels - Browse Channels', () => {

    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testTeam: any;
    let testUser: any;

    beforeAll(async () => {
        await System.apiCheckSystemHealth(siteOneUrl);

        const {team, user} = await Setup.apiInit(siteOneUrl);
        testTeam = team;
        testUser = user;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    beforeEach(async () => {
        // Dismiss any lingering "Removed from channel" or "Archived channel"
        // dialogs that may appear asynchronously via WebSocket events from
        // the previous test's channel archival (e.g. MM-T4729_5).
        await Alert.dismissChannelRemoveOrArchiveAlert();

        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    // Skip Android: R1 product — join target channel name not found in browse list

    // Skip both: android flake (CI 29954156963) plus iOS CI 30437339535, where
    // ExperimentalViewArchivedChannels never propagated to the client config.

    it('MM-T864_1 - should be able to search for a public channel, cancel search, and join via browse channels', async () => {
        // # Create an unjoined public channel to search for
        const {channel: unjoinedChannel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id});

        // # Open browse channels screen
        await BrowseChannelsScreen.open();

        // # Type the channel name in the search input
        await BrowseChannelsScreen.searchInput.replaceText(unjoinedChannel.name);

        // * Verify channel appears in search results
        await wait(timeouts.ONE_SEC);
        await expect(BrowseChannelsScreen.getChannelItemDisplayName(unjoinedChannel.name)).toHaveText(unjoinedChannel.display_name);

        // # Clear the search input
        await BrowseChannelsScreen.searchClearButton.tap();

        // * Verify search input is cleared (flat list is visible again)
        // Use 50% threshold: on iOS 26.x the search bar area clips the flat list
        // to ~50–74% of the screen, causing the default 75% check to fail.
        await expect(BrowseChannelsScreen.flatChannelList).toBeVisible(50);

        // # Search for the channel again
        await BrowseChannelsScreen.searchInput.replaceText(unjoinedChannel.name);
        await wait(timeouts.ONE_SEC);

        // # Tap on the channel item to join
        await BrowseChannelsScreen.getChannelItem(unjoinedChannel.name).multiTap(2);
        await wait(timeouts.ONE_SEC);
        await BrowseChannelsScreen.dismissScheduledPostTooltip();

        // * Verify joined the channel and channel screen is shown
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(unjoinedChannel.display_name);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
