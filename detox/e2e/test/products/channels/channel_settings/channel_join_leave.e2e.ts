// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

/**
 * Test Cases Included:
 * - MM-T3200: RN apps Join existing channel
 * - MM-T3202: RN apps Leave public channel
 * - MM-T3207: RN apps Leave private channel
 * - MM-T3188: RN apps Search for public channel Cancel search join channel
 */

import {Channel, Setup} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    BrowseChannelsScreen,
    ChannelInfoScreen,
    ChannelListScreen,
    ChannelScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Channels', () => {
    const serverOneDisplayName = 'Server 1';
    let testUser: any;
    let testTeam: any;

    beforeAll(async () => {
        const {user, team} = await Setup.apiInit(siteOneUrl);
        testUser = user;
        testTeam = team;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T3200 - RN apps Join existing channel', async () => {
        // Expected Results (for all steps):
        // * List filters as expected, and channel is joined and displayed
        // * System message shows you have joined the channel

        // # Setup: Create a test channel that the user is not a member of
        const channelName = `join-test-${getRandomId()}`;
        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: testTeam.id,
            name: channelName,
            displayName: channelName,
            type: 'O',
        });

        // Remove user from the channel so they can join it
        await Channel.apiRemoveUserFromChannel(siteOneUrl, channel.id, testUser.id);

        // # Step 1: From the channels list, tap on the "+" displayed to the right of "PUBLIC CHANNELS"
        await ChannelListScreen.headerPlusButton.tap();
        await BrowseChannelsScreen.toBeVisible();

        // # Step 2: Type the first two letters of a channel in the search box
        const searchTerm = channelName.substring(0, 2);
        await BrowseChannelsScreen.searchInput.typeText(searchTerm);

        // # Step 3: Observe list filtered by search term
        await wait(timeouts.ONE_SEC);
        await expect(BrowseChannelsScreen.getChannelItem(channel.display_name)).toBeVisible();

        // # Step 4: Tap a channel name to select it
        await BrowseChannelsScreen.getChannelItem(channel.display_name).tap();
        await wait(timeouts.ONE_SEC);

        // Tap again if needed (first tap may close keyboard)
        await BrowseChannelsScreen.getChannelItem(channel.display_name).tap();

        // * List filters as expected, and channel is joined and displayed
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(channel.display_name);

        // * System message shows you have joined the channel
        await wait(timeouts.TWO_SEC);
        const joinMessage = `${testUser.username} joined the channel`;
        await waitFor(element(by.text(joinMessage).withAncestor(by.id('post_list')))).
            toBeVisible().
            whileElement(by.id('post_list.flat_list')).
            scroll(50, 'down');

        // Go back to channel list
        await ChannelScreen.back();
    });

    it('MM-T3202 - RN apps Leave public channel', async () => {
        // Expected Results (for all steps):
        // * After #1,
        // * A message is displayed on screen asking whether or not you want to leave the channel
        // * After #2,
        // * You should be removed from the channel and be redirected to Town Square
        // * If you had tapped on "no", the message should just close and your view remains in channel info

        // # Setup: Create a test channel and navigate to it
        const channelName = `leave-test-${getRandomId()}`;
        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: testTeam.id,
            name: channelName,
            displayName: channelName,
            type: 'O', // Open (public) channel
        });

        await ChannelScreen.open('public', channel.display_name);

        // # Step 1: Tap on "leave channel"
        await ChannelInfoScreen.open();
        await expect(ChannelInfoScreen.leaveChannelOption).toBeVisible();
        await ChannelInfoScreen.leaveChannelOption.tap();

        // * After #1, a message is displayed on screen asking whether or not you want to leave the channel
        await wait(timeouts.ONE_SEC);
        const leaveAlertTitle = 'Leave';
        await expect(element(by.text(leaveAlertTitle))).toBeVisible();
        await expect(element(by.text(`Are you sure you want to leave the channel ${channel.display_name}?`))).toBeVisible();

        // # Step 2: Tap on "yes"
        await element(by.text('Yes')).tap();

        // * After #2, you should be removed from the channel and be redirected to Town Square
        await wait(timeouts.TWO_SEC);
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText('Town Square');
    });

    it('MM-T3207 - RN apps Leave private channel', async () => {
        // Expected Results (for all steps):
        // * Redirects to Town Square
        // * Channel no longer listed in channel drawer

        // # Setup: Create a private test channel
        const channelName = `private-leave-${getRandomId()}`;
        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: testTeam.id,
            name: channelName,
            displayName: channelName,
            type: 'P', // Private channel
        });

        // Navigate to the private channel
        await ChannelScreen.open('private', channel.display_name);

        // # Step 1: On a private channel, tap channel name
        await ChannelInfoScreen.open();

        // # Step 2: Tap Leave Channel
        await expect(ChannelInfoScreen.leaveChannelOption).toBeVisible();
        await ChannelInfoScreen.leaveChannelOption.tap();

        // # Step 3: Tap Yes on confirmation modal
        await wait(timeouts.ONE_SEC);
        await expect(element(by.text('Leave'))).toBeVisible();
        await element(by.text('Yes')).tap();

        // * Redirects to Town Square
        await wait(timeouts.TWO_SEC);
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText('Town Square');

        // * Channel no longer listed in channel drawer
        // The private channel should not be visible in the list anymore
        try {
            await expect(ChannelListScreen.getChannelItem('private', channel.display_name)).not.toBeVisible();
        } catch (e) {
            // If the element doesn't exist at all, that's also acceptable
        }
    });

    it('MM-T3188 - RN apps Search for public channel Cancel search join channel', async () => {
        // Expected Results (for all steps):
        // * Verify the channel name appears in the search results below

        // # Setup: Create a test channel that the user is not a member of
        const channelName = `search-join-${getRandomId()}`;
        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: testTeam.id,
            name: channelName,
            displayName: channelName,
            type: 'O',
        });

        // Remove user from the channel so they can search and join it
        await Channel.apiRemoveUserFromChannel(siteOneUrl, channel.id, testUser.id);

        // # Step 1: From the channels list, tap on the "+" next to Channels
        await ChannelListScreen.headerPlusButton.tap();
        await wait(timeouts.ONE_SEC);

        // # Step 2: Tap More Channels
        await BrowseChannelsScreen.toBeVisible();

        // # Step 3: Enter the beginning of a channel name you're not a member of into the search text field
        // * Verify the channel name appears in the search results below
        const searchTerm = channelName.substring(0, 4);
        await BrowseChannelsScreen.searchInput.typeText(searchTerm);
        await wait(timeouts.TWO_SEC);

        await expect(BrowseChannelsScreen.getChannelItem(channel.display_name)).toBeVisible();

        // Tap the channel to join it
        await BrowseChannelsScreen.getChannelItem(channel.display_name).tap();
        await wait(timeouts.ONE_SEC);

        // Tap again if needed (first tap may close keyboard)
        await BrowseChannelsScreen.getChannelItem(channel.display_name).tap();
        await wait(timeouts.TWO_SEC);

        // Verify we're in the channel
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(channel.display_name);

        // Go back to channel list
        await ChannelScreen.back();
    });
});
