// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    AgentsPlugin,
    Plugin,
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
import {isAndroid, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Agents - Channel Summary', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let agentsEnabled = false;

    beforeAll(async () => {
        // # Ensure agents plugin is installed and active (installs from Marketplace if needed)
        const pluginStatus = await Plugin.apiEnsurePluginInstalled(siteOneUrl, AgentsPlugin.id);
        if (!pluginStatus.isActive) {
            // eslint-disable-next-line no-console
            console.warn(`Agents plugin (${AgentsPlugin.id}) could not be activated — skipping suite`);
            return;
        }
        agentsEnabled = true;

        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(user);

        // # Wait for WebSocket to connect and agents status to be fetched
        await wait(timeouts.FOUR_SEC);

        // # On Android, verify the Ask Agents UI element actually appears in quick actions.
        // The API check above confirms the plugin is installed, but on Android the quick
        // actions sheet may not expose the element when the plugin is not fully configured.
        // Open quick actions, probe for the element, then close the sheet before tests run.
        if (isAndroid()) {
            await ChannelListScreen.toBeVisible();
            await ChannelScreen.open(channelsCategory, testChannel.name);
            await wait(timeouts.ONE_SEC);
            await ChannelScreen.channelQuickActionsButton.tap();
            try {
                await waitFor(element(by.id('channel.quick_actions.ask_agents'))).toBeVisible().withTimeout(timeouts.FOUR_SEC);
            } catch {
                // eslint-disable-next-line no-console
                console.warn('Ask Agents quick action not visible on Android — skipping suite');
                agentsEnabled = false;
            }
            await device.pressBack();
            await ChannelScreen.back();
        }
    });

    beforeEach(async () => {
        if (!agentsEnabled) {
            return;
        }

        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        if (!agentsEnabled) {
            return;
        }

        // # Log out
        await HomeScreen.logout();
    });

    // Skip: requires Agents plugin configured with at least one AI bot on CI server
    it.skip('should show Ask Agents option in public channel', async () => {
        if (!agentsEnabled) {
            return;
        }

        // # Open a channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // # Open quick actions by tapping the quick actions button
        await wait(timeouts.ONE_SEC);
        await ChannelScreen.channelQuickActionsButton.tap();

        // * Verify Ask Agents option is visible
        await waitFor(element(by.id('channel.quick_actions.ask_agents'))).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Close the bottom sheet by pressing back
        await device.pressBack();
        await ChannelScreen.back();
    });

    // Skip: requires Agents plugin configured with at least one AI bot on CI server
    it.skip('should open summary sheet and show options', async () => {
        if (!agentsEnabled) {
            return;
        }

        // # Open a channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // # Open quick actions by tapping the quick actions button
        await wait(timeouts.ONE_SEC);
        await ChannelScreen.channelQuickActionsButton.tap();

        // # Wait for and tap Ask Agents option to open the summary sheet
        await waitFor(element(by.id('channel.quick_actions.ask_agents'))).toBeVisible().withTimeout(timeouts.TEN_SEC);
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
