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
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    BrowseChannelsScreen,
    ChannelScreen,
    ChannelListScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {expect} from 'detox';

describe('Channels - Browse Channels', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testTeam: any;

    beforeAll(async () => {
        const {team, user} = await Setup.apiInit(siteOneUrl);
        testTeam = team;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(user);
    });

    beforeEach(async () => {
        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T4729_1 - should match elements on browse channels screen', async () => {
        // # Open browse channels screen
        await BrowseChannelsScreen.open();

        // * Verify basic elements on browse channels screen
        await expect(BrowseChannelsScreen.closeButton).toBeVisible();
        await expect(BrowseChannelsScreen.searchInput).toBeVisible();
        await expect(BrowseChannelsScreen.flatChannelList).toBeVisible();

        // # Go back to channel list screen
        await BrowseChannelsScreen.close();
    });

    it('MM-T4729_2 - should be able to browse and join channels', async () => {
        // # As admin, create a new channel so that user can join
        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id});

        // * Verify new channel does not appear on channel list screen
        await expect(ChannelListScreen.getChannelListItemDisplayName(channelsCategory, channel.display_name)).not.toExist();

        // # Open browse channels screen and search for the new channel name to join
        await BrowseChannelsScreen.open();
        await BrowseChannelsScreen.searchInput.replaceText(channel.name);

        // * Verify search returns the new channel item
        await expect(BrowseChannelsScreen.getChannelItemDisplayName(channel.name)).toHaveText(channel.display_name);

        // # Tap on the new channel item
        await BrowseChannelsScreen.getChannelItem(channel.name).tap();

        // * Verify on new channel screen
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(channel.display_name);
        await expect(ChannelScreen.introDisplayName).toHaveText(channel.display_name);

        // # Go back to channel list screen
        await ChannelScreen.back();
        await ChannelListScreen.toBeVisible();

        // * Verify new channel is added to channel list
        await expect(ChannelListScreen.getChannelListItemDisplayName(channelsCategory, channel.name)).toBeVisible();
    });
});
