// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    Bot,
    Channel,
    Setup,
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

const AGENTS_PLUGIN_ID = 'mattermost-ai';

/**
 * Check if the agents plugin (mattermost-ai) is installed and active.
 * @param {string} baseUrl - the base server URL
 * @return {boolean} true if the plugin is installed and active
 */
const isAgentsPluginActive = async (baseUrl: string): Promise<boolean> => {
    try {
        const response = await client.get(`${baseUrl}/api/v4/plugins`);
        const plugins = response.data;
        return plugins.active?.some((p: any) => p.id === AGENTS_PLUGIN_ID) ?? false;
    } catch {
        return false;
    }
};

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
 * The server identifies agents internally and returns them in a separate
 * `agents` field from the autocomplete endpoint — the same mechanism the
 * mobile app uses.
 * @param {string} baseUrl - the base server URL
 * @param {string} teamId - the team ID to scope the autocomplete query
 * @return {Array} list of agent bot objects
 */
const getAgentBots = async (baseUrl: string, teamId: string): Promise<any[]> => {
    const {bots, error} = await apiGetBots(baseUrl);
    if (error || !bots) {
        return [];
    }

    try {
        // Query the autocomplete API which returns agents in a dedicated field.
        const response = await client.get(
            `${baseUrl}/api/v4/users/autocomplete?in_team=${teamId}&name=`,
        );
        const agentUserIds = new Set(
            (response.data?.agents ?? []).map((a: any) => a.id),
        );

        return bots.filter((bot: any) => bot.delete_at === 0 && agentUserIds.has(bot.user_id));
    } catch {
        return [];
    }
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

    beforeAll(async () => {
        const {channel, team, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testTeam = team;

        // # Check if agents plugin is active
        pluginActive = await isAgentsPluginActive(siteOneUrl);

        // # Create a regular bot (not an agent) for comparison testing
        const {bot} = await Bot.apiCreateBot(siteOneUrl, {prefix: 'regularbot'});
        regularBot = bot;

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
    });

    beforeEach(async () => {
        // # Clear post input
        await ChannelScreen.postInput.clearText();

        // * Verify autocomplete is not displayed
        await Autocomplete.toBeVisible(false);
    });

    afterAll(async () => {
        // # Log out
        await ChannelScreen.back();
        await HomeScreen.logout();
    });

    it('should display regular bot with BOT tag in at-mention autocomplete', async () => {
        // # Type in "@" to activate at-mention autocomplete
        await ChannelScreen.postInput.typeText('@');
        await Autocomplete.toBeVisible();

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toExist();

        // # Type in regular bot username
        await ChannelScreen.postInput.typeText(regularBot.username);
        await wait(timeouts.TWO_SEC);

        // * Verify regular bot appears in autocomplete
        const {atMentionItem, atMentionItemBotTag} = Autocomplete.getAtMentionItem(regularBot.user_id);
        await expect(atMentionItem).toExist();

        // * Verify BOT tag is displayed for regular bot
        await expect(atMentionItemBotTag).toExist();
    });

    it('should not display AGENT tag for regular bot in at-mention autocomplete', async () => {
        // # Type in "@" to activate at-mention autocomplete
        await ChannelScreen.postInput.typeText('@');
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
        // # Type in "@" to activate at-mention autocomplete
        await ChannelScreen.postInput.typeText('@');
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

            // # Find agent bots
            agentBots = await getAgentBots(siteOneUrl, testTeam.id);
            if (agentBots.length === 0) {
                // eslint-disable-next-line no-console
                console.log('Skipping agent-specific tests: no agent bots found');
                return;
            }

            agentBot = agentBots[0];

            // # Ensure agent bot is in the team and channel
            await Team.apiAddUserToTeam(siteOneUrl, agentBot.user_id, testTeam.id).catch(() => { /* ignore */ });
            await Channel.apiAddUserToChannel(siteOneUrl, agentBot.user_id, testChannel.id).catch(() => { /* ignore */ });
        });

        it('should display agent with AGENT tag in at-mention autocomplete', async () => {
            if (!pluginActive || !agentBot) {
                return;
            }

            // # Clear and type in "@" to activate at-mention autocomplete
            await ChannelScreen.postInput.clearText();
            await Autocomplete.toBeVisible(false);
            await ChannelScreen.postInput.typeText('@');
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

            // # Clear and type in "@" to activate at-mention autocomplete
            await ChannelScreen.postInput.clearText();
            await Autocomplete.toBeVisible(false);
            await ChannelScreen.postInput.typeText('@');
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

            // # Clear and type in "@" to activate at-mention autocomplete
            await ChannelScreen.postInput.clearText();
            await Autocomplete.toBeVisible(false);
            await ChannelScreen.postInput.typeText('@');
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

            // # Clear and type in "@" to activate at-mention autocomplete
            await ChannelScreen.postInput.clearText();
            await Autocomplete.toBeVisible(false);
            await ChannelScreen.postInput.typeText('@');
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
