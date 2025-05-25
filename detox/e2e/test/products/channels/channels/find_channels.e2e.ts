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
    Team,
    User,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelScreen,
    ChannelListScreen,
    FindChannelsScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Channels - Find Channels', () => {
    const serverOneDisplayName = 'Server 1';
    let testChannel: any;
    let testTeam: any;
    let testUser: any;

    beforeAll(async () => {
        const {channel, team, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
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

    it('MM-T4907_1 - should match elements on find channels screen', async () => {
        // # Open find channels screen
        await FindChannelsScreen.open();

        // * Verify basic elements on find channels screen
        await expect(FindChannelsScreen.closeButton).toBeVisible();
        await expect(FindChannelsScreen.searchInput).toBeVisible();
        await expect(FindChannelsScreen.sectionUnfilteredChannelList).toExist();

        // # Go back to channel list screen
        await FindChannelsScreen.close();
    });

    it('MM-T4907_2 - should be able to find and navigate to a public channel', async () => {
        // # Open find channels screen and search for a public channel to navigate to
        await FindChannelsScreen.open();
        await FindChannelsScreen.searchInput.replaceText(testChannel.display_name);

        // # Tap on the target public channel item
        await FindChannelsScreen.getFilteredChannelItem(testChannel.name).tap();

        // * Verify on target public channel screen
        await verifyDetailsOnChannelScreen(testChannel.display_name);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T4907_3 - should display empty search state for find channels', async () => {
        // # Open find channels screen and search for a non-existent channel
        const searchTerm = 'blahblahblahblah';
        await FindChannelsScreen.open();
        await FindChannelsScreen.searchInput.replaceText(searchTerm);

        // * Verify empty search state for find channels
        await wait(timeouts.ONE_SEC);
        await expect(element(by.text(`No matches found for “${searchTerm}”`))).toBeVisible();
        await expect(element(by.text('Check the spelling or try another search.'))).toBeVisible();

        // # Go back to channel list screen
        await FindChannelsScreen.close();
    });

    it('MM-T4907_4 - should be able to find direct and group message channels', async () => {
        // # Create direct and group message channels, open find channels screen, and search for the direct message channel
        const {user: testOtherUser1} = await User.apiCreateUser(siteOneUrl, {prefix: 'a'});
        await Team.apiAddUserToTeam(siteOneUrl, testOtherUser1.id, testTeam.id);
        const {user: testOtherUser2} = await User.apiCreateUser(siteOneUrl, {prefix: 'b'});
        await Team.apiAddUserToTeam(siteOneUrl, testOtherUser2.id, testTeam.id);
        const {channel: directMessageChannel} = await Channel.apiCreateDirectChannel(siteOneUrl, [testUser.id, testOtherUser1.id]);
        const {channel: groupMessageChannel} = await Channel.apiCreateGroupChannel(siteOneUrl, [testUser.id, testOtherUser1.id, testOtherUser2.id]);
        await FindChannelsScreen.open();
        await FindChannelsScreen.searchInput.replaceText(testOtherUser1.username);

        // * Verify search returns the target direct message channel item
        await wait(timeouts.ONE_SEC);
        await expect(FindChannelsScreen.getFilteredChannelItemDisplayName(directMessageChannel.name)).toHaveText(testOtherUser1.username);

        // # Search for the group message channel
        await FindChannelsScreen.searchInput.replaceText(testOtherUser2.username);

        // * Verify search returns the target group message channel item
        await wait(timeouts.ONE_SEC);
        await FindChannelsScreen.getFilteredChannelItem(groupMessageChannel.name).tap();

        // * Verify on target GM screen
        await verifyDetailsOnChannelScreen(`${testOtherUser1.username}, admin, ${testOtherUser2.username}`);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T4907_5 - should be able to find an archived channel', async () => {
        // # Archive a channel, open find channels screen, and search for the archived channel
        const {channel: archivedChannel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id});
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, archivedChannel.id);
        await Channel.apiDeleteChannel(siteOneUrl, archivedChannel.id);
        await FindChannelsScreen.open();
        await FindChannelsScreen.searchInput.replaceText(archivedChannel.name);

        // * Verify search returns the target archived channel item
        await wait(timeouts.ONE_SEC);
        await FindChannelsScreen.getFilteredChannelItem(archivedChannel.name).tap();

        // * Verify on archievd channel name
        await verifyDetailsOnChannelScreen(archivedChannel.display_name);

        // # Go back to channel list screen by closing archived channel
        await expect(ChannelScreen.archievedCloseChannelButton).toBeVisible();
        await ChannelScreen.archievedCloseChannelButton.tap();
    });

    it('MM-T4907_6 - should be able to find a joined private channel and not find an unjoined private channel', async () => {
        // # Open find channels screen and search for a joined private channel
        const {channel: joinedPrivateChannel} = await Channel.apiCreateChannel(siteOneUrl, {type: 'P', teamId: testTeam.id});
        const {channel: unjoinedPrivateChannel} = await Channel.apiCreateChannel(siteOneUrl, {type: 'P', teamId: testTeam.id});
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, joinedPrivateChannel.id);
        await FindChannelsScreen.open();
        await FindChannelsScreen.searchInput.replaceText(joinedPrivateChannel.name);

        // * Verify search returns the target joined private channel item
        await wait(timeouts.ONE_SEC);

        // # Search for an unjoined private channel
        await FindChannelsScreen.searchInput.replaceText(unjoinedPrivateChannel.name);

        // * Verify empty search state for find channels
        await wait(timeouts.ONE_SEC);
        await expect(element(by.text(`No matches found for “${unjoinedPrivateChannel.name}”`))).toBeVisible();

        // # Go back to channel list screen
        await FindChannelsScreen.close();
    });
});

async function verifyDetailsOnChannelScreen(display_name: string) {
    try {
        await ChannelScreen.scheduledPostTooltipCloseButton.tap();
    } catch (error) {
        // eslint-disable-next-line no-console
        console.log('Element not visible, skipping click');
    }
    await ChannelScreen.toBeVisible();
    await expect(ChannelScreen.headerTitle).toHaveText(display_name);
    await expect(ChannelScreen.introDisplayName).toHaveText(display_name);
}
