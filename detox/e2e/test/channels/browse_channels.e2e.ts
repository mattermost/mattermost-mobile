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
import {
    BrowseChannelsScreen,
    ChannelDropdownMenuScreen,
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
    let testUser: any;

    beforeAll(async () => {
        System.apiUpdateConfig(siteOneUrl, {
            ServiceSettings: {
                EnableAPIChannelDeletion: true,
            },
            TeamSettings: {
                ExperimentalViewArchivedChannels: true,
            },
        });

        const {team, user} = await Setup.apiInit(siteOneUrl);
        testTeam = team;
        testUser = user;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
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

    it('MM-T4729_2 - should be able to browse and join a channel', async () => {
        // # As admin, create a new channel so that user can join
        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id});

        // * Verify new channel does not appear on channel list screen
        await expect(ChannelListScreen.getChannelItemDisplayName(channelsCategory, channel.display_name)).not.toExist();

        // # Open browse channels screen and search for the new channel name to join
        await BrowseChannelsScreen.open();
        await BrowseChannelsScreen.searchInput.replaceText(channel.name);

        // * Verify search returns the new channel item
        await expect(BrowseChannelsScreen.getChannelItemDisplayName(channel.name)).toHaveText(channel.display_name);

        // # Tap on the new channel item
        await BrowseChannelsScreen.getChannelItem(channel.name).multiTap(2);

        // * Verify on newly joined channel screen
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(channel.display_name);
        await expect(ChannelScreen.introDisplayName).toHaveText(channel.display_name);

        // # Go back to channel list screen
        await ChannelScreen.back();
        await ChannelListScreen.toBeVisible();

        // * Verify newly joined channel is added to channel list
        await expect(ChannelListScreen.getChannelItemDisplayName(channelsCategory, channel.name)).toBeVisible();
    });

    it('MM-T4729_3 - should display empty search state for browse channels', async () => {
        // # Open browse channels screen and search for a non-existent channel
        const searchTerm = 'blahblahblahblah';
        await BrowseChannelsScreen.open();
        await BrowseChannelsScreen.searchInput.replaceText(searchTerm);

        // * Verify empty search state for browse channels
        await expect(element(by.text(`No results for “${searchTerm}”`))).toBeVisible();
        await expect(element(by.text('Check the spelling or try another search.'))).toBeVisible();

        // # Go back to channel list screen
        await BrowseChannelsScreen.close();
    });

    it('MM-T4729_4 - should not be able to browse direct and group message channels', async () => {
        // # Create direct and group message channels, open browse channels screen, and search for the direct message channel
        const {user: testOtherUser1} = await User.apiCreateUser(siteOneUrl, {prefix: 'a'});
        await Team.apiAddUserToTeam(siteOneUrl, testOtherUser1.id, testTeam.id);
        const {user: testOtherUser2} = await User.apiCreateUser(siteOneUrl, {prefix: 'b'});
        await Team.apiAddUserToTeam(siteOneUrl, testOtherUser2.id, testTeam.id);
        await Channel.apiCreateDirectChannel(siteOneUrl, [testUser.id, testOtherUser1.id]);
        await Channel.apiCreateGroupChannel(siteOneUrl, [testUser.id, testOtherUser1.id, testOtherUser2.id]);
        await BrowseChannelsScreen.open();
        await BrowseChannelsScreen.searchInput.replaceText(testOtherUser1.username);

        // * Verify empty search state for browse channels
        await expect(element(by.text(`No results for “${testOtherUser1.username}”`))).toBeVisible();

        // # Search for the group message channel
        await BrowseChannelsScreen.searchInput.replaceText(testOtherUser2.username);

        // * Verify empty search state for browse channels
        await expect(element(by.text(`No results for “${testOtherUser2.username}”`))).toBeVisible();

        // # Go back to channel list screen
        await BrowseChannelsScreen.close();
    });

    it('MM-T4729_5 - should be able to browse an archived channel', async () => {
        // # Archive a channel, open browse channels screen, tap on channel dropdown, tap on archived channels menu item, and search for the archived channel
        const {channel: archivedChannel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id});
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, archivedChannel.id);
        await Channel.apiDeleteChannel(siteOneUrl, archivedChannel.id);
        await BrowseChannelsScreen.open();
        await BrowseChannelsScreen.channelDropdownTextPublic.tap();
        await ChannelDropdownMenuScreen.archivedChannelsItem.tap();
        await BrowseChannelsScreen.searchInput.replaceText(archivedChannel.name);

        // * Verify search returns the archived channel item
        await expect(BrowseChannelsScreen.getChannelItemDisplayName(archivedChannel.name)).toHaveText(archivedChannel.display_name);

        // # Go back to channel list screen
        await BrowseChannelsScreen.close();
    });
});
