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
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {Alert} from '@support/ui/component';
import {
    BrowseChannelsScreen,
    ChannelScreen,
    ChannelListScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {isAndroid, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

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

    (isAndroid() ? it.skip : it)('MM-T4729_2 - should be able to browse and join an unjoined public channel', async () => {
        // # As admin, create a new public channel so that user can join
        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id});

        // * Verify new public channel does not appear on channel list screen
        await expect(ChannelListScreen.getChannelItemDisplayName(channelsCategory, channel.display_name)).not.toExist();

        // # Open browse channels screen and search for the new public channel name to join
        await BrowseChannelsScreen.open();
        await BrowseChannelsScreen.searchInput.replaceText(channel.name);

        // * Verify search returns the new public channel item
        await wait(timeouts.ONE_SEC);
        await expect(BrowseChannelsScreen.getChannelItemDisplayName(channel.name)).toHaveText(channel.display_name);

        // # Tap on the new public channel item
        await BrowseChannelsScreen.getChannelItem(channel.name).multiTap(2);
        await wait(timeouts.ONE_SEC);
        await BrowseChannelsScreen.dismissScheduledPostTooltip();

        // * Verify on newly joined public channel screen
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(channel.display_name);
        await expect(ChannelScreen.introDisplayName).toHaveText(channel.display_name);

        // # Go back to channel list screen
        await ChannelScreen.back();
        await ChannelListScreen.toBeVisible();

        // * Verify newly joined public channel is added to channel list
        await expect(ChannelListScreen.getChannelItemDisplayName(channelsCategory, channel.name)).toBeVisible();
    });
});
