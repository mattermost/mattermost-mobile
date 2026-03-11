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
    getTimeoutMultiplier,
    getNetworkProfileInfo,
    isDegradedNetwork,
} from '@support/utils';
import {expect} from 'detox';

describe('Degradation - Message Delivery', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    const timeoutMultiplier = getTimeoutMultiplier();

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
        await waitFor(ChannelScreen.postInput).not.toHaveValue(message).withTimeout(timeouts.ONE_MIN * timeoutMultiplier);

        // * Verify message eventually appears (allow time for server round-trip)
        await wait(timeouts.TEN_SEC * timeoutMultiplier);

        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        expect(post.message).toBe(message);

        // * Verify the message is visible in the UI
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, message);
        await expect(postListPostItem).toBeVisible();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('DDIL-T002 - should show loading state for slow message send', async () => {
        // Skip this test under normal network conditions as it requires degraded network
        if (!isDegradedNetwork()) {
            // eslint-disable-next-line no-console
            console.log('Skipping test - not running under degraded network');
            return;
        }

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

        // * Wait for message to complete sending
        await waitFor(ChannelScreen.sendButtonDisabled).toBeVisible().withTimeout(timeouts.TWO_MIN * timeoutMultiplier);

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

        // # Send multiple messages in sequence
        // eslint-disable-next-line no-await-in-loop
        for (const message of messages) {
            await ChannelScreen.postMessage(message);
            await wait(timeouts.ONE_SEC);
        }

        // * Allow time for all messages to sync
        await wait(timeouts.TEN_SEC * timeoutMultiplier);

        // * Verify all messages arrived in order via API
        const response = await Post.apiGetPostsInChannel(siteOneUrl, testChannel.id);
        const recentPosts = response.order.slice(0, 3).map((id: string) => response.posts[id].message);

        // Posts are ordered newest-first, so reverse for chronological order
        const chronologicalPosts = recentPosts.reverse();

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
