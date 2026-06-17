// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {isAgentsPluginActive} from '@support/agents_plugin';
import {
    Bot,
    Channel,
    Setup,
    System,
    Team,
} from '@support/server_api';
import client from '@support/server_api/client';
import {getResponseFromError} from '@support/server_api/common';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {Autocomplete} from '@support/ui/component';
import {
    ChannelListScreen,
    ChannelScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {expect} from 'detox';

// ****************************************************************
// Agent API helpers
// ****************************************************************

const E2E_AGENT_USERNAME = 'ai-bot';

/**
 * Get all bots from the server.
 * @param {string} baseUrl - the base server URL
 * @return {Object} returns {bots} on success or {error} on error
 */
const apiGetBots = async (baseUrl: string): Promise<any> => {
    try {
        const response = await client.get(`${baseUrl}/api/v4/bots`);
        return {bots: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Find agents among bots by cross-referencing with the autocomplete API.
 * Falls back to the plugin agents API when autocomplete omits the agents field.
 */
const getAgentBots = async (baseUrl: string, teamId: string): Promise<any[]> => {
    const {bots, error} = await apiGetBots(baseUrl);
    if (error || !bots) {
        throw new Error(
            `[getAgentBots] Failed to fetch bots: ${JSON.stringify(error ?? 'no bots returned')}`,
        );
    }

    const activeBots = bots.filter((bot: any) => bot.delete_at === 0);

    try {
        const response = await client.get(
            `${baseUrl}/api/v4/users/autocomplete?in_team=${teamId}&name=`,
        );
        const agentUserIds = new Set(
            (response.data?.agents ?? []).map((a: any) => a.id),
        );

        if (agentUserIds.size > 0) {
            return activeBots.filter((bot: any) => agentUserIds.has(bot.user_id));
        }
    } catch (err) {
        const {error: autocompleteError, status} = getResponseFromError(err);
        throw new Error(
            `[getAgentBots] Failed to fetch autocomplete agents (status ${status}): ${JSON.stringify(autocompleteError)}`,
        );
    }

    try {
        const pluginAgentsRes = await client.get(`${baseUrl}/plugins/mattermost-ai/agents`);
        const pluginAgents = Array.isArray(pluginAgentsRes.data) ? pluginAgentsRes.data : [];
        const agentNames = new Set(pluginAgents.map((agent: any) => agent.name));

        const fromPlugin = activeBots.filter((bot: any) => agentNames.has(bot.username));
        if (fromPlugin.length > 0) {
            return fromPlugin;
        }
    } catch (err) {
        const {error: pluginError, status} = getResponseFromError(err);
        throw new Error(
            `[getAgentBots] Failed to fetch plugin agents (status ${status}): ${JSON.stringify(pluginError)}`,
        );
    }

    const e2eBot = activeBots.find((bot: any) => bot.username === E2E_AGENT_USERNAME);
    return e2eBot ? [e2eBot] : [];
};

// ****************************************************************
// Tests
// ****************************************************************

describe('Autocomplete - Agent Mention', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let testTeam: any;
    let pluginActive: boolean;
    let regularBot: any;
    let channelOpened = false;

    beforeAll(async () => {
        const {channel, team, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testTeam = team;

        // # Check if agents plugin is active
        pluginActive = await isAgentsPluginActive(siteOneUrl);

        // # Enable bot account creation (disabled by default on fresh servers)
        await System.apiUpdateConfig(siteOneUrl, {ServiceSettings: {EnableBotAccountCreation: true}});

        // # Create a regular bot (not an agent) for comparison testing
        const botResult = await Bot.apiCreateBot(siteOneUrl, {prefix: 'regularbot'});
        if (!botResult.bot) {
            throw new Error(
                `[beforeAll] Failed to create regular bot: ${JSON.stringify(botResult.error ?? 'unknown error')}`,
            );
        }
        regularBot = botResult.bot;

        // # Add bot to team and channel
        await Team.apiAddUserToTeam(siteOneUrl, regularBot.user_id, testTeam.id);
        await Channel.apiAddUserToChannel(siteOneUrl, regularBot.user_id, testChannel.id);

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(user);

        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();

        // # Open a channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);
        channelOpened = true;
    });

    beforeEach(async () => {
        // # Clear post input
        await ChannelScreen.postInput.clearText();

        // * Verify autocomplete is not displayed
        await Autocomplete.toBeVisible(false);
    });

    afterAll(async () => {
        // # Navigate back only if beforeAll successfully opened the channel
        if (channelOpened) {
            await ChannelScreen.back();
        }
        await HomeScreen.logout();
    });

    it('should display regular bot in at-mention autocomplete', async () => {
        // # Tap @ quick action to activate at-mention autocomplete.
        // typeText('@') on an unfocused input does not fire onSelectionChange on
        // Android API 35, leaving cursorPosition=0 so matchTerm=null and
        // autocomplete never appears. The quick action directly sets cursorPosition
        // in React state, bypassing onSelectionChange.
        await ChannelScreen.atInputQuickAction.tap();
        await Autocomplete.toBeVisible();

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toExist();

        // # Type in regular bot username
        await ChannelScreen.postInput.typeText(regularBot.username);
        await wait(timeouts.TWO_SEC);

        // * Verify regular bot appears in autocomplete (user rows do not show BOT tags on main)
        const {atMentionItem, atMentionItemBotTag} = Autocomplete.getAtMentionItem(regularBot.user_id);
        await expect(atMentionItem).toExist();
        await expect(atMentionItemBotTag).not.toExist();
    });

    it('should not display AGENT tag for regular bot in at-mention autocomplete', async () => {
        // # Tap @ quick action to activate at-mention autocomplete
        await ChannelScreen.atInputQuickAction.tap();
        await Autocomplete.toBeVisible();

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toExist();

        // # Type in regular bot username
        await ChannelScreen.postInput.typeText(regularBot.username);
        await wait(timeouts.TWO_SEC);

        // * Verify regular bot appears in autocomplete
        const {atMentionItem, atMentionItemAgentTag} = Autocomplete.getAtMentionItem(regularBot.user_id);
        await expect(atMentionItem).toExist();

        // * Verify AGENT tag is NOT displayed for regular bot
        await expect(atMentionItemAgentTag).not.toExist();
    });

    it('should be able to select regular bot from at-mention autocomplete', async () => {
        // # Tap @ quick action to activate at-mention autocomplete
        await ChannelScreen.atInputQuickAction.tap();
        await Autocomplete.toBeVisible();

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toExist();

        // # Type in regular bot username
        await ChannelScreen.postInput.typeText(regularBot.username);
        await wait(timeouts.TWO_SEC);

        // * Verify bot appears in autocomplete and tap it
        const {atMentionItem} = Autocomplete.getAtMentionItem(regularBot.user_id);
        await expect(atMentionItem).toExist();
        await atMentionItem.tap();

        // * Verify at-mention list disappears after selection
        await expect(Autocomplete.sectionAtMentionList).not.toExist();
    });

    describe('Agent-specific tests (requires mattermost-ai plugin)', () => {
        let agentBots: any[];
        let agentBot: any;

        beforeAll(async () => {
            if (!pluginActive) {
                // eslint-disable-next-line no-console
                console.log('Skipping agent-specific tests: mattermost-ai plugin is not active');
                return;
            }

            // # Find agent bots — fail if the plugin is active but none exist
            agentBots = await getAgentBots(siteOneUrl, testTeam.id);
            if (agentBots.length === 0) {
                throw new Error(
                    'Agent plugin (mattermost-ai) is active but no agent bots were discovered. ' +
                    'Ensure at least one agent is configured on the test server.',
                );
            }

            agentBot = agentBots[0];

            // # Ensure agent bot is in the team and channel
            try {
                await Team.apiAddUserToTeam(siteOneUrl, agentBot.user_id, testTeam.id);
            } catch (err: any) {
                const msg = err?.message ?? '';
                if (!msg.includes('already') && !msg.includes('is_member')) {
                    throw err;
                }
            }
            try {
                await Channel.apiAddUserToChannel(siteOneUrl, agentBot.user_id, testChannel.id);
            } catch (err: any) {
                const msg = err?.message ?? '';
                if (!msg.includes('already') && !msg.includes('is_member')) {
                    throw err;
                }
            }
        });

        it('should display agent with AGENT tag in at-mention autocomplete', async () => {
            if (!pluginActive || !agentBot) {
                return;
            }

            // # Clear input and tap @ quick action to activate at-mention autocomplete
            await ChannelScreen.postInput.clearText();
            await Autocomplete.toBeVisible(false);
            await ChannelScreen.atInputQuickAction.tap();
            await Autocomplete.toBeVisible();

            // * Verify at-mention list is displayed
            await expect(Autocomplete.sectionAtMentionList).toExist();

            // # Type in agent bot username
            await ChannelScreen.postInput.typeText(agentBot.username);
            await wait(timeouts.TWO_SEC);

            // * Verify agent bot appears in autocomplete
            const {atMentionItem, atMentionItemAgentTag} = Autocomplete.getAtMentionItem(agentBot.user_id);
            await expect(atMentionItem).toExist();

            // * Verify AGENT tag is displayed
            await expect(atMentionItemAgentTag).toExist();
        });

        it('should not display BOT tag for agent in at-mention autocomplete', async () => {
            if (!pluginActive || !agentBot) {
                return;
            }

            // # Clear input and tap @ quick action to activate at-mention autocomplete
            await ChannelScreen.postInput.clearText();
            await Autocomplete.toBeVisible(false);
            await ChannelScreen.atInputQuickAction.tap();
            await Autocomplete.toBeVisible();

            // * Verify at-mention list is displayed
            await expect(Autocomplete.sectionAtMentionList).toExist();

            // # Type in agent bot username
            await ChannelScreen.postInput.typeText(agentBot.username);
            await wait(timeouts.TWO_SEC);

            // * Verify agent bot appears in autocomplete
            const {atMentionItem, atMentionItemBotTag} = Autocomplete.getAtMentionItem(agentBot.user_id);
            await expect(atMentionItem).toExist();

            // * Verify BOT tag is NOT displayed for agent
            await expect(atMentionItemBotTag).not.toExist();
        });

        it('should display agent display name in at-mention autocomplete', async () => {
            if (!pluginActive || !agentBot) {
                return;
            }

            // # Clear input and tap @ quick action to activate at-mention autocomplete
            await ChannelScreen.postInput.clearText();
            await Autocomplete.toBeVisible(false);
            await ChannelScreen.atInputQuickAction.tap();
            await Autocomplete.toBeVisible();

            // * Verify at-mention list is displayed
            await expect(Autocomplete.sectionAtMentionList).toExist();

            // # Type in agent bot username
            await ChannelScreen.postInput.typeText(agentBot.username);
            await wait(timeouts.TWO_SEC);

            // * Verify agent bot display name is shown
            const {atMentionItemUserDisplayName} = Autocomplete.getAtMentionItem(agentBot.user_id);
            await expect(atMentionItemUserDisplayName).toExist();
        });

        it('should be able to select agent from at-mention autocomplete', async () => {
            if (!pluginActive || !agentBot) {
                return;
            }

            // # Clear input and tap @ quick action to activate at-mention autocomplete
            await ChannelScreen.postInput.clearText();
            await Autocomplete.toBeVisible(false);
            await ChannelScreen.atInputQuickAction.tap();
            await Autocomplete.toBeVisible();

            // * Verify at-mention list is displayed
            await expect(Autocomplete.sectionAtMentionList).toExist();

            // # Type in agent bot username and tap on it
            await ChannelScreen.postInput.typeText(agentBot.username);
            await wait(timeouts.TWO_SEC);

            const {atMentionItem} = Autocomplete.getAtMentionItem(agentBot.user_id);
            await expect(atMentionItem).toExist();
            await atMentionItem.tap();

            // * Verify at-mention list disappears after selection
            await expect(Autocomplete.sectionAtMentionList).not.toExist();
        });
    });
});
