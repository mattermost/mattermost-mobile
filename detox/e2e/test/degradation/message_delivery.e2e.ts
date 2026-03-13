// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    Post,
    Setup,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelScreen,
    ChannelListScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {
    getRandomId,
    timeouts,
    wait,
    getCurrentNetworkProfile,
    getNetworkProfileInfo,
    isDegradedNetwork,
} from '@support/utils';
import {expect} from 'detox';

// Cap timeouts to prevent extremely long waits (max 3 minutes)
// Note: timeouts.* are already scaled by getTimeoutMultiplier() in index.ts
const MAX_TIMEOUT = 3 * 60 * 1000;
const cappedTimeout = (timeout: number) => Math.min(timeout, MAX_TIMEOUT);

describe('Degradation - Message Delivery', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;

    beforeAll(async () => {
        // Log network profile for debugging - visible in test output
        // eslint-disable-next-line no-console
        console.log(getNetworkProfileInfo());

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

    it('DDIL-T001 - should eventually deliver message under degraded network', async () => {
        // # Open a channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // # Create and send a message
        const message = `Degradation test ${getRandomId()} - ${getCurrentNetworkProfile()}`;
        await ChannelScreen.postInput.tap();
        await ChannelScreen.postInput.replaceText(message);

        // # Tap send button
        await ChannelScreen.sendButton.tap();

        // * Wait for message to appear in post list (with extended timeout for degraded network)
        // Under degraded conditions, this may take significantly longer
        await waitFor(ChannelScreen.postInput).not.toHaveValue(message).withTimeout(cappedTimeout(timeouts.ONE_MIN));

        // * Verify message eventually appears (allow time for server round-trip)
        await wait(cappedTimeout(timeouts.TEN_SEC));

        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        expect(post.message).toBe(message);

        // * Verify the message is visible in the UI
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, message);
        await expect(postListPostItem).toBeVisible();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    // This test requires degraded network to observe loading states
    const degradedOnlyTest = isDegradedNetwork() ? it : it.skip;
    degradedOnlyTest('DDIL-T002 - should show loading state for slow message send', async () => {
        // # Open a channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // # Create a message
        const message = `Slow send test ${getRandomId()}`;
        await ChannelScreen.postInput.tap();
        await ChannelScreen.postInput.replaceText(message);

        // # Tap send button
        await ChannelScreen.sendButton.tap();

        // * Under degraded network, the send button should be disabled while sending
        // This validates the app provides appropriate feedback during slow operations
        await expect(ChannelScreen.sendButtonDisabled).toBeVisible();

        // * Wait for message to complete sending (input clears when sent)
        await waitFor(ChannelScreen.postInput).toHaveText('').withTimeout(cappedTimeout(timeouts.TWO_MIN));

        // * Verify message was delivered
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        expect(post.message).toBe(message);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('DDIL-T003 - should send multiple messages in order', async () => {
        // # Open a channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);

        const messages = [
            `First message ${getRandomId()}`,
            `Second message ${getRandomId()}`,
            `Third message ${getRandomId()}`,
        ];

        // # Send multiple messages in sequence (sequential await is intentional for test ordering)
        for (const message of messages) {
            // eslint-disable-next-line no-await-in-loop
            await ChannelScreen.postMessage(message);
            // eslint-disable-next-line no-await-in-loop
            await wait(timeouts.ONE_SEC);
        }

        // * Allow time for all messages to sync
        await wait(cappedTimeout(timeouts.TEN_SEC));

        // * Verify all messages arrived in order via API
        // apiGetPostsInChannel returns {posts: Post[]} where posts is an ordered array (newest first)
        const {posts} = await Post.apiGetPostsInChannel(siteOneUrl, testChannel.id);

        // Filter to find only our test messages (by matching the unique message content)
        const ourPosts = posts.
            map((p: {message: string}) => p.message).
            filter((msg: string) => messages.some((m) => msg === m));

        // Verify we found all our messages
        expect(ourPosts.length).toBe(messages.length);

        // Posts are ordered newest-first, so reverse for chronological order
        const chronologicalPosts = ourPosts.reverse();

        for (let i = 0; i < messages.length; i++) {
            expect(chronologicalPosts[i]).toBe(messages[i]);
        }

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('DDIL-T004 - should handle channel switch during slow network', async () => {
        // # Open first channel
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // * Verify channel loads
        await expect(ChannelScreen.headerTitle).toHaveText(testChannel.display_name);

        // # Go back and verify channel list is responsive
        await ChannelScreen.back();
        await ChannelListScreen.toBeVisible();

        // # Open channel again - should work even under degradation
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await expect(ChannelScreen.headerTitle).toHaveText(testChannel.display_name);

        // # Go back
        await ChannelScreen.back();
    });
});
