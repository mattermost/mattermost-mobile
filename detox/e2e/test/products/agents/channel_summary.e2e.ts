// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    Setup,
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
import {timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Agents - Channel Summary', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;

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

        // # Open quick actions by tapping the quick actions button
        await wait(timeouts.ONE_SEC);
        await ChannelScreen.channelQuickActionsButton.tap();

        // * Verify Ask Agents option is visible
        await waitFor(element(by.id('channel.quick_actions.ask_agents'))).toBeVisible().withTimeout(timeouts.FOUR_SEC);

        // # Close the bottom sheet by pressing back
        await device.pressBack();
        await ChannelScreen.back();
    });

    it('should open summary sheet and show options', async () => {
        // # Open a channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // # Open quick actions by tapping the quick actions button
        await wait(timeouts.ONE_SEC);
        await ChannelScreen.channelQuickActionsButton.tap();

        // # Wait for and tap Ask Agents option to open the summary sheet
        await waitFor(element(by.id('channel.quick_actions.ask_agents'))).toBeVisible().withTimeout(timeouts.FOUR_SEC);
        await element(by.id('channel.quick_actions.ask_agents')).tap();

        // * Verify summary options are visible
        await waitFor(element(by.id('agents.channel_summary.option.unreads'))).toBeVisible().withTimeout(timeouts.FOUR_SEC);
        await expect(element(by.id('agents.channel_summary.option.7d'))).toBeVisible();
        await expect(element(by.id('agents.channel_summary.option.custom'))).toBeVisible();
        await expect(element(by.id('agents.channel_summary.agent_selector'))).toBeVisible();

        // # Open Agent Selector panel
        await element(by.id('agents.channel_summary.agent_selector')).tap();

        // * Verify Agent Selector back button is visible
        await waitFor(element(by.id('agents.selector.back'))).toBeVisible().withTimeout(timeouts.FOUR_SEC);

        // # Go back from Agent Selector
        await element(by.id('agents.selector.back')).tap();

        // # Wait for main options to reappear and open Date Range Picker
        await waitFor(element(by.id('agents.channel_summary.option.custom'))).toBeVisible().withTimeout(timeouts.FOUR_SEC);
        await element(by.id('agents.channel_summary.option.custom')).tap();

        // * Verify Date Picker UI elements
        await waitFor(element(by.id('agents.channel_summary.date_picker.back'))).toBeVisible().withTimeout(timeouts.FOUR_SEC);
        await expect(element(by.id('agents.channel_summary.date_from'))).toBeVisible();

        // # Go back from Date Picker
        await element(by.id('agents.channel_summary.date_picker.back')).tap();

        // # Close the bottom sheet by pressing back
        await wait(timeouts.ONE_SEC);
        await device.pressBack();

        // # Navigate back to channel list
        await ChannelScreen.back();
    });
});
