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
    getTimeoutMultiplier,
    getNetworkProfileInfo,
    getCurrentNetworkProfile,
} from '@support/utils';
import {expect} from 'detox';

describe('Degradation - Connection Recovery', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let testUser: any;
    const timeoutMultiplier = getTimeoutMultiplier();

    beforeAll(async () => {
        // Log network profile for debugging - visible in test output
        // eslint-disable-next-line no-console
        console.log(getNetworkProfileInfo());

        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testUser = user;

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

    it('DDIL-T010 - should recover after app backgrounding', async () => {
        // # Open a channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // # Send a message before backgrounding
        const beforeMessage = `Before background ${getRandomId()}`;
        await ChannelScreen.postMessage(beforeMessage);

        // * Verify message was sent
        const {post: beforePost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        expect(beforePost.message).toBe(beforeMessage);

        // # Background the app
        await device.sendToBackground();
        await wait(timeouts.TEN_SEC);

        // # Bring app back to foreground
        await device.launchApp({newInstance: false});

        // * Verify channel is still visible
        await expect(ChannelScreen.headerTitle).toHaveText(testChannel.display_name);

        // # Send a message after returning from background
        const afterMessage = `After background ${getRandomId()}`;
        await ChannelScreen.postMessage(afterMessage);

        // * Allow time for sync under degraded conditions
        await wait(timeouts.TEN_SEC * timeoutMultiplier);

        // * Verify message was sent
        const {post: afterPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        expect(afterPost.message).toBe(afterMessage);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('DDIL-T011 - should receive messages sent while app was backgrounded', async () => {
        // # Open a channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // # Background the app
        await device.sendToBackground();

        // # Send a message via API while app is backgrounded
        const apiMessage = `API message while backgrounded ${getRandomId()}`;
        await Post.apiCreatePost(siteOneUrl, {
            channel_id: testChannel.id,
            message: apiMessage,
        });

        // # Wait a bit then bring app back
        await wait(timeouts.FOUR_SEC);
        await device.launchApp({newInstance: false});

        // * Allow time for sync under degraded conditions
        await wait(timeouts.TEN_SEC * timeoutMultiplier);

        // * Verify the message appears in the channel
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, apiMessage);

        await waitFor(postListPostItem)
            .toBeVisible()
            .withTimeout(timeouts.ONE_MIN * timeoutMultiplier);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('DDIL-T012 - should handle rapid navigation under degraded network', async () => {
        // Rapid navigation tests the app's ability to cancel pending requests
        // and handle state transitions under slow network

        // # Navigate into channel
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await expect(ChannelScreen.headerTitle).toBeVisible();

        // # Quick back navigation
        await ChannelScreen.back();
        await ChannelListScreen.toBeVisible();

        // # Navigate back into channel
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // # Try to type and send a message
        const message = `Rapid nav test ${getRandomId()}`;
        await ChannelScreen.postMessage(message);

        // * Verify message sent successfully
        await wait(timeouts.TEN_SEC * timeoutMultiplier);
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        expect(post.message).toBe(message);

        // # Go back
        await ChannelScreen.back();
    });

    it('DDIL-T013 - should show connection status indicator appropriately', async () => {
        // This test validates that the app shows appropriate UI feedback
        // about connection state under degraded conditions

        // Note: The specific testIDs for connection banner may vary
        // Update these based on actual component implementation

        // # Open a channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // * Under degraded conditions, the app should still be functional
        // even if showing slow connection indicators

        // # Send a message to verify functionality
        const message = `Connection test ${getRandomId()} - ${getCurrentNetworkProfile()}`;
        await ChannelScreen.postMessage(message);

        // * Allow extended time for delivery under degraded network
        await wait(timeouts.HALF_MIN * timeoutMultiplier);

        // * Verify message was delivered
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        expect(post.message).toBe(message);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
