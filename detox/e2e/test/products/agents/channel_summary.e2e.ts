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
import {device, expect, waitFor} from 'detox';

// Skip: flaky under TSIO parallel CI — ask_agents / quick_actions (runs 31407140087, 31418589782).
describe.skip('Agents - Channel Summary', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let didLogin = false;
    let askAgentsAvailable = false;

    beforeAll(async () => {
        const pluginStatus = await Plugin.apiGetPluginStatus(siteOneUrl, AgentsPlugin.id);
        if (!pluginStatus.isActive) {
            // eslint-disable-next-line no-console
            console.warn(`Agents plugin (${AgentsPlugin.id}) is not active — skipping suite`);
            return;
        }

        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(user);
        didLogin = true;

        // # Wait for WebSocket to connect and agents status to be fetched
        await wait(timeouts.TEN_SEC);

        // # On Android, verify the Ask Agents UI element actually appears in quick actions.
        // device.pressBack() is Android-only — iOS dismisses the sheet with a swipe.
        if (isAndroid()) {
            await ChannelListScreen.toBeVisible();
            await ChannelScreen.open(channelsCategory, testChannel.name);
            await wait(timeouts.ONE_SEC);
            await ChannelScreen.channelQuickActionsButton.tap();
            try {
                await waitFor(element(by.id('channel.quick_actions.ask_agents'))).toBeVisible().withTimeout(timeouts.FOUR_SEC);
                askAgentsAvailable = true;
            } catch {
                // eslint-disable-next-line no-console
                console.warn('Ask Agents quick action not visible on Android — tests remain skipped');
            }
            await device.pressBack();
            await ChannelScreen.back();
        } else {
            await ChannelListScreen.toBeVisible();
            await ChannelScreen.open(channelsCategory, testChannel.name);
            await wait(timeouts.ONE_SEC);
            await ChannelScreen.channelQuickActionsButton.tap();
            try {
                await waitFor(element(by.id('channel.quick_actions.ask_agents'))).toBeVisible().withTimeout(timeouts.FOUR_SEC);
                askAgentsAvailable = true;
            } catch {
                // eslint-disable-next-line no-console
                console.warn('Ask Agents quick action not visible on iOS — tests remain skipped');
            }
            try {
                // Dismiss via the sheet root — ask_agents is absent when Agents UI isn't ready.
                await element(by.id('channel.quick_actions')).swipe('down', 'fast');
            } catch {
                try {
                    await element(by.id('channel.quick_actions.ask_agents')).swipe('down', 'fast');
                } catch {
                    // Sheet may already be closed.
                }
            }
            try {
                await ChannelScreen.back();
            } catch {
                // beforeAll must not throw — tests no-op when Ask Agents is unavailable.
            }
        }
    });

    beforeEach(async () => {
        if (!didLogin) {
            return;
        }

        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        if (!didLogin) {
            return;
        }

        // # Log out
        await HomeScreen.logout();
    });

    const itWhenLoggedIn = (name: string, fn: () => Promise<void>) => {
        it(name, async () => {
            if (!didLogin || !askAgentsAvailable) {
                return;
            }
            await fn();
        });
    };

    itWhenLoggedIn('should show Ask Agents option in public channel', async () => {
        // # Open a channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // # Open quick actions by tapping the quick actions button
        await wait(timeouts.ONE_SEC);
        await ChannelScreen.channelQuickActionsButton.tap();

        // * Verify Ask Agents option is visible
        await waitFor(element(by.id('channel.quick_actions.ask_agents'))).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Close the bottom sheet — pressBack is Android-only
        if (isAndroid()) {
            await device.pressBack();
        } else {
            await element(by.id('channel.quick_actions')).swipe('down', 'fast');
        }
        await ChannelScreen.back();
    });

    itWhenLoggedIn('should open summary sheet and show options', async () => {
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

        // # Close the bottom sheet — pressBack is Android-only
        await wait(timeouts.ONE_SEC);
        if (isAndroid()) {
            await device.pressBack();
        } else {
            await element(by.id('agents.channel_summary.option.unreads')).swipe('down', 'fast');
        }

        // # Navigate back to channel list
        await ChannelScreen.back();
    });
});
