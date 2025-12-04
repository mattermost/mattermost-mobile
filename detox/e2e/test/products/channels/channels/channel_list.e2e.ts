// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    Setup,
    Team,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    BrowseChannelsScreen,
    ChannelScreen,
    ChannelListScreen,
    CreateDirectMessageScreen,
    CreateOrEditChannelScreen,
    FindChannelsScreen,
    GlobalThreadsScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Channels - Channel List', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    const directMessagesCategory = 'direct_messages';
    const offTopicChannelName = 'off-topic';
    const townSquareChannelName = 'town-square';
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

    it('MM-T4728_1 - should match elements on channel list screen', async () => {
        // * Verify basic elements on channel list screen
        await expect(ChannelListScreen.serverIcon).toBeVisible();
        await expect(ChannelListScreen.headerTeamDisplayName).toHaveText(testTeam.display_name);
        await expect(ChannelListScreen.headerServerDisplayName).toHaveText(serverOneDisplayName);
        await expect(ChannelListScreen.headerPlusButton).toBeVisible();
        await expect(ChannelListScreen.threadsButton).toBeVisible();
        await expect(ChannelListScreen.getCategoryHeaderDisplayName(channelsCategory)).toHaveText('CHANNELS');
        await waitFor(ChannelListScreen.getChannelItemDisplayName(channelsCategory, testChannel.name)).toBeVisible().withTimeout(timeouts.TWO_SEC);
        await expect(ChannelListScreen.getChannelItemDisplayName(channelsCategory, testChannel.name)).toBeVisible();
        await waitFor(ChannelListScreen.getChannelItemDisplayName(channelsCategory, offTopicChannelName)).toBeVisible().withTimeout(timeouts.TWO_SEC);
        await expect(ChannelListScreen.getChannelItemDisplayName(channelsCategory, offTopicChannelName)).toBeVisible();
        await waitFor(ChannelListScreen.getChannelItemDisplayName(channelsCategory, townSquareChannelName)).toBeVisible().withTimeout(timeouts.TWO_SEC);
        await expect(ChannelListScreen.getChannelItemDisplayName(channelsCategory, townSquareChannelName)).toBeVisible();
        await waitFor(ChannelListScreen.getCategoryHeaderDisplayName(directMessagesCategory)).toBeVisible().withTimeout(timeouts.TWO_SEC);
        await expect(ChannelListScreen.getCategoryHeaderDisplayName(directMessagesCategory)).toBeVisible();
    });

    it('MM-T4728_2 - should be able to switch between channels', async () => {
        // # Tap on a first channel
        await ChannelListScreen.getChannelItemDisplayName(channelsCategory, testChannel.name).tap();
        await ChannelScreen.closeScheduledMessageTooltip();

        // * Verify on first channel
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(testChannel.display_name);

        // # Go back to channel list screen and tap on a second channel
        await ChannelScreen.back();
        await ChannelListScreen.toBeVisible();
        await ChannelListScreen.getChannelItemDisplayName(channelsCategory, offTopicChannelName).tap();

        // * Verify on second channel
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText('Off-Topic');

        // # Go back to channel list screen and tap on a third channel
        await ChannelScreen.back();
        await ChannelListScreen.toBeVisible();
        await ChannelListScreen.getChannelItemDisplayName(channelsCategory, townSquareChannelName).tap();

        // * Verify on third channel
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText('Town Square');

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T4728_3 - should be able to collapse and expand categories', async () => {
        // # Go to a channel to make it active and go back to channel list screen
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage('Test message');
        await ChannelScreen.back();

        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();

        // # Toggle channels category to collapse
        await ChannelListScreen.getCategoryExpanded(channelsCategory).tap();

        // * Verify category is collapsed and channels are not listed
        await wait(timeouts.ONE_SEC);
        await expect(ChannelListScreen.getCategoryCollapsed(channelsCategory)).toBeVisible();
        await expect(ChannelListScreen.getChannelItemDisplayName(channelsCategory, testChannel.name)).not.toBeVisible();
        await expect(ChannelListScreen.getChannelItemDisplayName(channelsCategory, offTopicChannelName)).not.toBeVisible();
        await expect(ChannelListScreen.getChannelItemDisplayName(channelsCategory, townSquareChannelName)).not.toBeVisible();

        // # Toggle channels category to expand
        await ChannelListScreen.getCategoryCollapsed(channelsCategory).tap();

        // * Verify category is expanded and all channels are listed
        await wait(timeouts.ONE_SEC);
        await expect(ChannelListScreen.getCategoryExpanded(channelsCategory)).toBeVisible();
        await expect(ChannelListScreen.getChannelItemDisplayName(channelsCategory, testChannel.name)).toBeVisible();
        await expect(ChannelListScreen.getChannelItemDisplayName(channelsCategory, offTopicChannelName)).toBeVisible();
        await expect(ChannelListScreen.getChannelItemDisplayName(channelsCategory, townSquareChannelName)).toBeVisible();
    });

    it('MM-T4728_4 - should be able to go to browse channels screen', async () => {
        // # Tap on plus menu button and tap on browse channels item
        await ChannelListScreen.headerPlusButton.tap();
        await wait(timeouts.ONE_SEC);
        await ChannelListScreen.browseChannelsItem.tap();

        // * Verify on browse channels screen
        await BrowseChannelsScreen.toBeVisible();

        // # Go back to channel list screen
        await BrowseChannelsScreen.close();
    });

    it('MM-T4728_5 - should be able to go to create direct message screen', async () => {
        // # Tap on plus menu button and tap on open a direct message item
        await ChannelListScreen.headerPlusButton.tap();
        await wait(timeouts.ONE_SEC);
        await ChannelListScreen.openDirectMessageItem.tap();

        // * Verify on create direct message screen
        await CreateDirectMessageScreen.toBeVisible();

        try {
            await CreateDirectMessageScreen.closeTutorial();
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to close tutorial:', error);
        }

        // # Go back to channel list screen
        await CreateDirectMessageScreen.close();
    });

    it('MM-T4728_6 - should be able to go to create channel screen', async () => {
        // # Tap on plus menu button and tap on create new channel item
        await ChannelListScreen.headerPlusButton.tap();
        await wait(timeouts.ONE_SEC);
        await ChannelListScreen.createNewChannelItem.tap();

        // * Verify on create channel screen
        await CreateOrEditChannelScreen.toBeVisible();

        // # Go back to channel list screen
        await CreateOrEditChannelScreen.close();
    });

    it('MM-T4728_7 - should be able to go to global threads screen', async () => {
        // # Tap on threads button
        await ChannelListScreen.threadsButton.tap();

        // * Verify on global threads screen
        await GlobalThreadsScreen.toBeVisible();

        // # Go back to channel list screen
        await GlobalThreadsScreen.back();
    });

    it('MM-T4728_8 - should be able to go to find channels screen', async () => {
        // # Tap on search field button
        await ChannelListScreen.subheaderSearchFieldButton.tap();

        // * Verify on find channels screen
        await FindChannelsScreen.toBeVisible();

        // # Go back to channel list screen
        await FindChannelsScreen.close();
    });

    it('MM-T4728_9 - should be able to switch between teams', async () => {
        // # As admin, create a second team and add user to the second team; as user, terminate app and relaunch app
        const {team: testTeamTwo} = await Team.apiCreateTeam(siteOneUrl, {prefix: 'a'});
        await Team.apiAddUserToTeam(siteOneUrl, testUser.id, testTeamTwo.id);
        await device.reloadReactNative();

        // * Verify on first team and team sidebar item is selected and has correct display name abbreviation
        await expect(ChannelListScreen.headerTeamDisplayName).toHaveText(testTeam.display_name);
        await expect(ChannelListScreen.getTeamItemSelected(testTeam.id)).toBeVisible();
        await expect(ChannelListScreen.getTeamItemDisplayNameAbbreviation(testTeam.id)).toHaveText(testTeam.display_name.substring(0, 2).toUpperCase());

        // # Tap on second team item from team sidebar
        await ChannelListScreen.getTeamItemNotSelected(testTeamTwo.id).tap();

        // * Verify on second team and team sidebar item is selected and has correct display name abbreviation
        await expect(ChannelListScreen.headerTeamDisplayName).toHaveText(testTeamTwo.display_name);
        await expect(ChannelListScreen.getTeamItemSelected(testTeamTwo.id)).toBeVisible();
        await expect(ChannelListScreen.getTeamItemDisplayNameAbbreviation(testTeamTwo.id)).toHaveText(testTeamTwo.display_name.substring(0, 2).toUpperCase());

        // # Tap back on first team item from team sidebar
        await ChannelListScreen.getTeamItemNotSelected(testTeam.id).tap();

        // * Verify on first team
        await expect(ChannelListScreen.headerTeamDisplayName).toHaveText(testTeam.display_name);
    });
});
