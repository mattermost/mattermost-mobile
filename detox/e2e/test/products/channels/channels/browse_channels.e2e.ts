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
    ChannelScreen,
    ChannelListScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {isAndroid, timeouts, wait, waitForElementToExist} from '@support/utils';
import {expect, waitFor} from 'detox';

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

    it('MM-T4729_2 - should be able to browse and join an unjoined public channel', async () => {
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

    it('MM-T4729_3 - should display empty search state for browse channels', async () => {
        // # Open browse channels screen and search for a non-existent channel
        const searchTerm = 'blahblahblahblah';
        await BrowseChannelsScreen.open();
        await BrowseChannelsScreen.searchInput.replaceText(searchTerm);

        // * Verify empty search state for browse channels
        // On Android edge-to-edge the empty-state text can render with <50% area visible
        // (status/nav bar insets). Use toExist() on Android — the text is present and
        // the assertion confirms the correct empty state is shown.
        await wait(timeouts.ONE_SEC);
        if (isAndroid()) {
            await waitForElementToExist(element(by.text(`No matches found for \u201C${searchTerm}\u201D`)), timeouts.HALF_MIN);
            await waitForElementToExist(element(by.text('Check the spelling or try another search.')), timeouts.HALF_MIN);
        } else {
            await expect(element(by.text(`No matches found for \u201C${searchTerm}\u201D`))).toBeVisible();
            await expect(element(by.text('Check the spelling or try another search.'))).toBeVisible();
        }

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
        // On Android edge-to-edge, empty-state text may have <50% visible area. Use toExist().
        await wait(timeouts.ONE_SEC);
        if (isAndroid()) {
            await waitForElementToExist(element(by.text(`No matches found for \u201C${testOtherUser1.username}\u201D`)), timeouts.HALF_MIN);
        } else {
            await expect(element(by.text(`No matches found for \u201C${testOtherUser1.username}\u201D`))).toBeVisible();
        }

        // # Search for the group message channel
        await BrowseChannelsScreen.searchInput.replaceText(testOtherUser2.username);

        // * Verify empty search state for browse channels
        if (isAndroid()) {
            await waitForElementToExist(element(by.text(`No matches found for \u201C${testOtherUser2.username}\u201D`)), timeouts.HALF_MIN);
        } else {
            await expect(element(by.text(`No matches found for \u201C${testOtherUser2.username}\u201D`))).toBeVisible();
        }

        // # Go back to channel list screen
        await BrowseChannelsScreen.close();
    });

    it('MM-T4729_5 - should be able to browse an archived channel', async () => {
        // # Enable archived channel visibility on the server, then reload so the app
        // picks up the new config (the ChannelDropdown only renders when this is true)
        await System.apiUpdateConfig(siteOneUrl, {ServiceSettings: {ExperimentalViewArchivedChannels: true}});
        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();

        // # Create a channel, add the test user, then archive it
        const {channel: archivedChannel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id});
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, archivedChannel.id);
        await Channel.apiDeleteChannel(siteOneUrl, archivedChannel.id);

        // # Open browse channels screen and switch to archived channels view
        await BrowseChannelsScreen.open();
        await BrowseChannelsScreen.channelDropdownTextPublic.tap();
        await waitFor(element(by.id('browse_channels.dropdown_slideup_item.archived_channels'))).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await element(by.id('browse_channels.dropdown_slideup_item.archived_channels')).tap();

        // # Search for the archived channel by name
        await BrowseChannelsScreen.searchInput.replaceText(archivedChannel.name);

        // * Verify the archived channel appears in results
        await waitFor(BrowseChannelsScreen.getChannelItem(archivedChannel.name)).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen and restore server config
        await BrowseChannelsScreen.close();
        await System.apiUpdateConfig(siteOneUrl, {ServiceSettings: {ExperimentalViewArchivedChannels: false}});
    });

    it('MM-T4729_6 - should not be able to browse a joined public channel', async () => {
        // # Open browse channels screen and search for a joined public channel
        const {channel: joinedPublicChannel} = await Channel.apiCreateChannel(siteOneUrl, {type: 'O', teamId: testTeam.id});
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, joinedPublicChannel.id);
        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();
        await BrowseChannelsScreen.open();
        await BrowseChannelsScreen.searchInput.replaceText(joinedPublicChannel.name);

        // * Verify empty search state for browse channels
        await waitFor(element(by.text(`No matches found for \u201C${joinedPublicChannel.name}\u201D`))).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await BrowseChannelsScreen.close();
    });

    it('MM-T4729_7 - should not be able to browse joined and unjoined private channel', async () => {
        // # As admin, create joined and unjoined private channels, open browse channels screen, and search for the joined private channel
        const {channel: joinedPrivateChannel} = await Channel.apiCreateChannel(siteOneUrl, {type: 'P', teamId: testTeam.id});
        const {channel: unjoinedPrivateChannel} = await Channel.apiCreateChannel(siteOneUrl, {type: 'P', teamId: testTeam.id});
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, joinedPrivateChannel.id);
        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();
        await BrowseChannelsScreen.open();
        await BrowseChannelsScreen.searchInput.replaceText(joinedPrivateChannel.name);

        // * Verify empty search state for browse channels
        await waitFor(element(by.text(`No matches found for \u201C${joinedPrivateChannel.name}\u201D`))).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Search for the unjoined private channel
        await BrowseChannelsScreen.searchInput.replaceText(unjoinedPrivateChannel.name);

        // * Verify empty search state for browse channels
        await waitFor(element(by.text(`No matches found for \u201C${unjoinedPrivateChannel.name}\u201D`))).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await BrowseChannelsScreen.close();
    });

    it('MM-T864 - should be able to search for a public channel, cancel search, and join via browse channels', async () => {
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
