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
import client from '@support/server_api/client';
import {getResponseFromError} from '@support/server_api/common';
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
import {getRandomId, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

// ****************************************************************
// Agent post helpers
// ****************************************************************

const ToolCallStatus = {
    Pending: 0,
    Accepted: 1,
    Rejected: 2,
    Error: 3,
    Success: 4,
} as const;

interface ToolCallData {
    id: string;
    name: string;
    description: string;
    arguments: Record<string, unknown>;
    result?: string;
    status: number;
}

/**
 * Generate a tool call object for test data.
 */
const makeToolCall = (overrides: Partial<ToolCallData> = {}): ToolCallData => ({
    id: `tc_${getRandomId(6)}`,
    name: 'search_documents',
    description: 'Search for documents in the knowledge base',
    arguments: {query: 'quarterly report'},
    status: ToolCallStatus.Pending,
    ...overrides,
});

/**
 * Create an agent post with tool calls via the REST API.
 * Posts are created with type 'custom_llmbot' so the mobile app renders them as AgentPost.
 */
const apiCreateAgentPost = async (
    baseUrl: string,
    {channelId, requesterUserId, toolCalls, message = '', extraProps = {}}: {
        channelId: string;
        requesterUserId: string;
        toolCalls: ToolCallData[];
        message?: string;
        extraProps?: Record<string, unknown>;
    },
): Promise<any> => {
    try {
        const response = await client.post(`${baseUrl}/api/v4/posts`, {
            channel_id: channelId,
            message,
            type: 'custom_llmbot',
            props: {
                llm_requester_user_id: requesterUserId,
                pending_tool_call: JSON.stringify(toolCalls),
                ...extraProps,
            },
        });
        return {post: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

// ****************************************************************
// Tests
// ****************************************************************

describe('Agents - Tool Calls in Channels', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
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

    it('should display tool call card with tool name for pending tool calls', async () => {
        // # Create a tool call with a known name
        const toolCall = makeToolCall({name: 'search_documents'});

        // # Create an agent post with pending tool calls (Phase 1)
        await apiCreateAgentPost(siteOneUrl, {
            channelId: testChannel.id,
            requesterUserId: testUser.id,
            toolCalls: [toolCall],
        });

        // # Open the channel
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await wait(timeouts.TWO_SEC);

        // * Verify tool approval set is visible
        await waitFor(element(by.id('agents.tool_approval_set'))).toBeVisible().withTimeout(timeouts.FOUR_SEC);

        // * Verify tool card is visible with the correct tool ID
        await expect(element(by.id(`agents.tool_card.${toolCall.id}`))).toBeVisible();

        // * Verify tool name is displayed (converted from underscores to spaces and capitalized)
        await expect(element(by.id(`agents.tool_card.${toolCall.id}.name`))).toBeVisible();

        // # Navigate back
        await ChannelScreen.back();
    });

    it('should show Accept and Reject buttons for pending tool calls when user is requester', async () => {
        // # Create a pending tool call
        const toolCall = makeToolCall();

        // # Create an agent post where the test user is the requester
        await apiCreateAgentPost(siteOneUrl, {
            channelId: testChannel.id,
            requesterUserId: testUser.id,
            toolCalls: [toolCall],
        });

        // # Open the channel
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await wait(timeouts.TWO_SEC);

        // * Verify Accept button is visible
        await waitFor(element(by.id(`agents.tool_card.${toolCall.id}.approve`))).toBeVisible().withTimeout(timeouts.FOUR_SEC);

        // * Verify Reject button is visible
        await expect(element(by.id(`agents.tool_card.${toolCall.id}.reject`))).toBeVisible();

        // # Navigate back
        await ChannelScreen.back();
    });

    it('should not show approval buttons when user is not the requester', async () => {
        // # Create a second user and add to the test channel
        const {user: otherUser} = await User.apiCreateUser(siteOneUrl, {prefix: 'other'});
        await Team.apiAddUserToTeam(siteOneUrl, otherUser.id, testTeam.id);
        await Channel.apiAddUserToChannel(siteOneUrl, otherUser.id, testChannel.id);

        // # Create a pending tool call
        const toolCall = makeToolCall();

        // # Create an agent post where the OTHER user is the requester (not the logged-in user)
        await apiCreateAgentPost(siteOneUrl, {
            channelId: testChannel.id,
            requesterUserId: otherUser.id,
            toolCalls: [toolCall],
        });

        // # Open the channel
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await wait(timeouts.TWO_SEC);

        // * Verify tool card is visible
        await waitFor(element(by.id(`agents.tool_card.${toolCall.id}`))).toBeVisible().withTimeout(timeouts.FOUR_SEC);

        // * Verify Accept button is NOT visible (user is not the requester)
        await expect(element(by.id(`agents.tool_card.${toolCall.id}.approve`))).not.toBeVisible();

        // * Verify Reject button is NOT visible
        await expect(element(by.id(`agents.tool_card.${toolCall.id}.reject`))).not.toBeVisible();

        // # Navigate back
        await ChannelScreen.back();
    });

    it('should display tool calls with success status and results', async () => {
        // # Create a successful tool call with a result
        const toolCall = makeToolCall({
            name: 'fetch_data',
            status: ToolCallStatus.Success,
            result: JSON.stringify({data: 'Sample result data'}),
        });

        // # Create an agent post with the completed tool call
        await apiCreateAgentPost(siteOneUrl, {
            channelId: testChannel.id,
            requesterUserId: testUser.id,
            toolCalls: [toolCall],
        });

        // # Open the channel
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await wait(timeouts.TWO_SEC);

        // * Verify tool card is visible
        await waitFor(element(by.id(`agents.tool_card.${toolCall.id}`))).toBeVisible().withTimeout(timeouts.FOUR_SEC);

        // * Verify tool name is displayed
        await expect(element(by.id(`agents.tool_card.${toolCall.id}.name`))).toBeVisible();

        // # Navigate back
        await ChannelScreen.back();
    });

    it('should display rejected status for rejected tool calls', async () => {
        // # Create a rejected tool call
        const toolCall = makeToolCall({
            name: 'dangerous_action',
            status: ToolCallStatus.Rejected,
        });

        // # Create an agent post with the rejected tool call
        await apiCreateAgentPost(siteOneUrl, {
            channelId: testChannel.id,
            requesterUserId: testUser.id,
            toolCalls: [toolCall],
        });

        // # Open the channel
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await wait(timeouts.TWO_SEC);

        // * Verify tool card is visible
        await waitFor(element(by.id(`agents.tool_card.${toolCall.id}`))).toBeVisible().withTimeout(timeouts.FOUR_SEC);

        // # Tap the tool card header to expand it (rejected cards are collapsed by default)
        await element(by.id(`agents.tool_card.${toolCall.id}.header`)).tap();
        await wait(timeouts.ONE_SEC);

        // * Verify rejected status is visible
        await expect(element(by.id(`agents.tool_card.${toolCall.id}.status.rejected`))).toBeVisible();

        // # Navigate back
        await ChannelScreen.back();
    });

    it('should show Share and Keep Private buttons during result approval phase', async () => {
        // # Create a successful tool call (tool has executed)
        const toolCall = makeToolCall({
            name: 'web_search',
            status: ToolCallStatus.Success,
            result: JSON.stringify({results: ['result 1', 'result 2']}),
        });

        // # Create an agent post in Phase 2 (pending_tool_result = 'true')
        await apiCreateAgentPost(siteOneUrl, {
            channelId: testChannel.id,
            requesterUserId: testUser.id,
            toolCalls: [toolCall],
            extraProps: {
                pending_tool_result: 'true',
            },
        });

        // # Open the channel
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await wait(timeouts.TWO_SEC);

        // * Verify tool card is visible
        await waitFor(element(by.id(`agents.tool_card.${toolCall.id}`))).toBeVisible().withTimeout(timeouts.FOUR_SEC);

        // * Verify Share button is visible
        await waitFor(element(by.id(`agents.tool_card.${toolCall.id}.share`))).toBeVisible().withTimeout(timeouts.FOUR_SEC);

        // * Verify Keep Private button is visible
        await expect(element(by.id(`agents.tool_card.${toolCall.id}.keep_private`))).toBeVisible();

        // # Navigate back
        await ChannelScreen.back();
    });

    it('should display warning callout during result approval phase', async () => {
        // # Create a successful tool call with result
        const toolCall = makeToolCall({
            name: 'code_search',
            status: ToolCallStatus.Success,
            result: 'Found 3 matching files in the repository',
        });

        // # Create an agent post in Phase 2 (result approval)
        await apiCreateAgentPost(siteOneUrl, {
            channelId: testChannel.id,
            requesterUserId: testUser.id,
            toolCalls: [toolCall],
            extraProps: {
                pending_tool_result: 'true',
            },
        });

        // # Open the channel
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await wait(timeouts.TWO_SEC);

        // * Verify tool card is visible
        await waitFor(element(by.id(`agents.tool_card.${toolCall.id}`))).toBeVisible().withTimeout(timeouts.FOUR_SEC);

        // * Verify warning callout is visible (review tool response warning)
        await waitFor(element(by.id(`agents.tool_card.${toolCall.id}.warning`))).toBeVisible().withTimeout(timeouts.FOUR_SEC);

        // # Navigate back
        await ChannelScreen.back();
    });

    it('should show pending decisions counter for multiple pending tool calls', async () => {
        // # Create multiple pending tool calls
        const toolCall1 = makeToolCall({name: 'search_web'});
        const toolCall2 = makeToolCall({name: 'read_file'});
        const toolCall3 = makeToolCall({name: 'execute_query'});

        // # Create an agent post with multiple tool calls
        await apiCreateAgentPost(siteOneUrl, {
            channelId: testChannel.id,
            requesterUserId: testUser.id,
            toolCalls: [toolCall1, toolCall2, toolCall3],
        });

        // # Open the channel
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await wait(timeouts.TWO_SEC);

        // * Verify all tool cards are visible
        await waitFor(element(by.id(`agents.tool_card.${toolCall1.id}`))).toBeVisible().withTimeout(timeouts.FOUR_SEC);
        await expect(element(by.id(`agents.tool_card.${toolCall2.id}`))).toBeVisible();
        await expect(element(by.id(`agents.tool_card.${toolCall3.id}`))).toBeVisible();

        // * Verify pending decisions status bar is visible (for multiple tool calls)
        await expect(element(by.id('agents.tool_approval_set.pending_decisions'))).toBeVisible();

        // # Navigate back
        await ChannelScreen.back();
    });

    it('should show tool arguments when expanded in a DM channel', async () => {
        // # Get admin user info (the server API client is logged in as admin)
        const adminResponse = await client.get(`${siteOneUrl}/api/v4/users/me`);
        const adminUser = adminResponse.data;

        // # Create a DM channel between admin and the test user
        const {channel: dmChannel} = await Channel.apiCreateDirectChannel(siteOneUrl, [adminUser.id, testUser.id]);

        // # Create a pending tool call with known arguments
        const toolCall = makeToolCall({
            name: 'search_knowledge_base',
            arguments: {query: 'quarterly results', limit: 10},
        });

        // # Create an agent post in the DM channel
        await apiCreateAgentPost(siteOneUrl, {
            channelId: dmChannel.id,
            requesterUserId: testUser.id,
            toolCalls: [toolCall],
        });

        // # Open the DM channel (DMs use a different category)
        await wait(timeouts.TWO_SEC);
        await ChannelListScreen.toBeVisible();

        // # Use find channels to navigate to the DM
        const {headerPlusButton} = ChannelListScreen;
        await headerPlusButton.tap();
        await element(by.id('channel_list.header.plus_menu.open_direct_message')).tap();

        // # Search for admin user in the DM create screen
        await waitFor(element(by.id('create_direct_message.search_bar.search.input'))).toBeVisible().withTimeout(timeouts.FOUR_SEC);
        await element(by.id('create_direct_message.search_bar.search.input')).typeText(adminUser.username);
        await wait(timeouts.ONE_SEC);
        await element(by.id(`create_direct_message.user_list.user_item.${adminUser.id}`)).tap();
        await element(by.id('create_direct_message.start.button')).tap();

        await wait(timeouts.TWO_SEC);

        // * Verify tool card is visible
        await waitFor(element(by.id(`agents.tool_card.${toolCall.id}`))).toBeVisible().withTimeout(timeouts.FOUR_SEC);

        // * Verify arguments are visible (DM channels show arguments without redaction)
        await expect(element(by.id(`agents.tool_card.${toolCall.id}.arguments`))).toBeVisible();

        // # Navigate back
        await ChannelScreen.back();
    });

    it('should display mix of pending and completed tool calls', async () => {
        // # Create a mix of tool calls in different states
        const pendingToolCall = makeToolCall({
            name: 'pending_action',
            status: ToolCallStatus.Pending,
        });
        const completedToolCall = makeToolCall({
            name: 'completed_action',
            status: ToolCallStatus.Success,
            result: 'Action completed successfully',
        });
        const rejectedToolCall = makeToolCall({
            name: 'rejected_action',
            status: ToolCallStatus.Rejected,
        });

        // # Create an agent post with mixed tool call states
        await apiCreateAgentPost(siteOneUrl, {
            channelId: testChannel.id,
            requesterUserId: testUser.id,
            toolCalls: [pendingToolCall, completedToolCall, rejectedToolCall],
        });

        // # Open the channel
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await wait(timeouts.TWO_SEC);

        // * Verify all tool cards are visible
        await waitFor(element(by.id(`agents.tool_card.${pendingToolCall.id}`))).toBeVisible().withTimeout(timeouts.FOUR_SEC);
        await expect(element(by.id(`agents.tool_card.${completedToolCall.id}`))).toBeVisible();
        await expect(element(by.id(`agents.tool_card.${rejectedToolCall.id}`))).toBeVisible();

        // * Verify the pending tool call has approval buttons
        await expect(element(by.id(`agents.tool_card.${pendingToolCall.id}.approve`))).toBeVisible();
        await expect(element(by.id(`agents.tool_card.${pendingToolCall.id}.reject`))).toBeVisible();

        // # Navigate back
        await ChannelScreen.back();
    });
});
