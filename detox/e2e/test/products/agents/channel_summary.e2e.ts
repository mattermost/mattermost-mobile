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
    ChannelListScreen,
    ChannelScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {expect} from 'detox';

describe('Agents - Channel Summary', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    const directMessagesCategory = 'direct_messages';
    let testChannel: any;
    let testUser: any;
    let testTeam: any;

    beforeAll(async () => {
        const {channel, team, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testUser = user;
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

    it('should show Ask Agents option in public channel', async () => {
        // # Open a channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // # Open quick actions
        await ChannelScreen.headerTitle.tap();

        // * Verify Ask Agents option is visible
        await expect(element(by.id('channel.quick_actions.ask_agents'))).toBeVisible();

        // # Close quick actions
        await ChannelScreen.back();
    });

    it('should NOT show Ask Agents option in DM', async () => {
        // # Create a DM
        const {user: otherUser} = await User.apiCreateUser(siteOneUrl);
        await Team.apiAddUserToTeam(siteOneUrl, otherUser.id, testTeam.id);
        await Channel.apiCreateDirectChannel(siteOneUrl, [testUser.id, otherUser.id]);

        // # Open DM
        // Note: ChannelListScreen.getChannelItemDisplayName expects display name, which for DM is username usually (or display name depending on config).
        // For API created user, display name might be empty or specific.
        // Setup.apiCreateUser creates user with username, first_name, last_name.
        // The list item usually shows username or full name.
        // Let's rely on CreateDirectMessageScreen flow if we were creating it manually, but here we use API.
        // ChannelScreen.open uses ChannelListScreen.getChannelItemDisplayName.
        // Typically it matches the username for DMs.
        await ChannelScreen.open(directMessagesCategory, otherUser.username);

        // # Open quick actions
        await ChannelScreen.headerTitle.tap();

        // * Verify Ask Agents option is NOT visible
        await expect(element(by.id('channel.quick_actions.ask_agents'))).not.toBeVisible();

        await ChannelScreen.back();
    });

    it('should open summary sheet and show options', async () => {
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.headerTitle.tap();

        // # Tap Ask Agents
        await element(by.id('channel.quick_actions.ask_agents')).tap();

        // * Verify options
        await expect(element(by.id('agents.channel_summary.option.unreads'))).toBeVisible();
        await expect(element(by.id('agents.channel_summary.option.7d'))).toBeVisible();
        await expect(element(by.id('agents.channel_summary.option.custom'))).toBeVisible();
        await expect(element(by.id('agents.channel_summary.agent_selector'))).toBeVisible();

        // # Open Agent Selector
        await element(by.id('agents.channel_summary.agent_selector')).tap();

        // * Verify Agent Selector UI
        await expect(element(by.id('agents.selector.back'))).toBeVisible();

        // Check for empty state or agents depending on server state.
        // Since we don't have agents, it should likely show "No agents available" or similar.
        // element(by.text('No agents available'))

        // # Go back from Agent Selector
        await element(by.id('agents.selector.back')).tap();

        // # Open Date Picker
        await element(by.id('agents.channel_summary.option.custom')).tap();

        // * Verify Date Picker UI
        await expect(element(by.id('agents.channel_summary.date_picker.back'))).toBeVisible();
        await expect(element(by.id('agents.channel_summary.date_from'))).toBeVisible();

        // # Go back from Date Picker
        await element(by.id('agents.channel_summary.date_picker.back')).tap();

        // # Close sheet (via back button since it's a bottom sheet)
        // If it's a standard navigation modal, back button works.
        // If it's a bottom sheet, tapping back usually closes it.
        // Or we can tap the close button if it has one (ChannelSummarySheet doesn't seem to have an explicit close button ID except the one passed to bottomSheet wrapper 'close-channel-summary').
        // Let's try matching the ID 'close-channel-summary' if it exists.
        // Or just go back to channel screen.
        await ChannelScreen.back();
    });
});

