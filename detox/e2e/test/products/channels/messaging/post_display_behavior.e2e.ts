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
    ChannelListScreen,
    ChannelScreen,
    HomeScreen,
    LoginScreen,
    PostOptionsScreen,
    ServerScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Messaging - Post Display Behavior', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let testUser: any;

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testUser = user;

        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    beforeEach(async () => {
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        await HomeScreen.logout();
    });

    it('MM-T77_1 - should not repeat profile info for consecutive messages from same user', async () => {
        // # Open a channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // # Post first message
        const firstMessage = `First message ${getRandomId()}`;
        const {post: firstPost} = await ChannelScreen.postMessageAndVerify(firstMessage, testChannel.id, siteOneUrl);

        // # Post second consecutive message as the same user
        const secondMessage = `Second message ${getRandomId()}`;
        const {post: secondPost} = await ChannelScreen.postMessageAndVerify(secondMessage, testChannel.id, siteOneUrl);

        // * Verify first post has a display name header
        const {postListPostItemHeaderDisplayName: firstPostHeader} = ChannelScreen.getPostListPostItem(firstPost.id, firstMessage);
        await expect(firstPostHeader).toExist();

        // * Verify second consecutive post does NOT show the display name again
        const {postListPostItemHeaderDisplayName: secondPostHeader} = ChannelScreen.getPostListPostItem(secondPost.id, secondMessage);
        await expect(secondPostHeader).not.toExist();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    // Prove "left the bottom" by an older post becoming visible — not by a short
    // newest row clearing Espresso's 50% not.toBeVisible() gate (Android 91px rows never did).
    it('MM-T216_1 - should scroll to bottom when sending a message after scrolling up', async () => {
        // # Create many posts via API to fill the channel history and enable scrolling
        const oldestFillerMessage = `Filler post 0 ${getRandomId()}`;
        const {post: oldestFillerPost} = await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: oldestFillerMessage,
        });
        for (let i = 1; i < 20; i++) {
            // eslint-disable-next-line no-await-in-loop
            await Post.apiCreatePost(siteOneUrl, {channelId: testChannel.id, message: `Filler post ${i} ${getRandomId()}`});
        }

        // # Open channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // # Wait for the FlatList to fully render before scrolling — without this Detox's
        // scroll() can throw a divide-by-zero on Android.
        const lastFillerPost = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: lastFillerItem} = ChannelScreen.getPostListPostItem(lastFillerPost.post.id, lastFillerPost.post.message);
        await waitFor(lastFillerItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        const {postListPostItem: oldestFillerItem} = ChannelScreen.getPostListPostItem(
            oldestFillerPost.id,
            oldestFillerMessage,
        );

        // # Scroll up from mid-screen until an older post arrives on screen.
        // Small increments avoid long-press opening post-options over the draft input.
        await waitFor(oldestFillerItem).toBeVisible(40).whileElement(by.id(ChannelScreen.postList.testID.flatList)).scroll(300, 'up', 0.5, 0.5);
        await wait(timeouts.ONE_SEC);

        // # Close the post-options sheet if a scroll gesture still tripped a long press.
        let postOptionsOpen = true;
        try {
            await waitFor(PostOptionsScreen.postOptionsScreen).toExist().withTimeout(timeouts.HALF_SEC);
        } catch {
            postOptionsOpen = false;
        }
        if (postOptionsOpen) {
            await PostOptionsScreen.close();
        }

        // * Re-verify an older post is on screen (list left the bottom) with no sheet open.
        await expect(oldestFillerItem).toBeVisible(40);

        // # Send a new message from the UI
        const newMessage = `New bottom message ${getRandomId()}`;

        // * Verify the new message is visible (view scrolled to bottom)
        const {post: lastPost} = await ChannelScreen.postMessageAndVerify(newMessage, testChannel.id, siteOneUrl);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(lastPost.id, newMessage);
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T3147_1 - should scroll to bottom when a message is received while keyboard is open', async () => {
        // # Create filler posts and the target message via API before opening the channel
        for (let i = 0; i < 15; i++) {
            // eslint-disable-next-line no-await-in-loop
            await Post.apiCreatePost(siteOneUrl, {channelId: testChannel.id, message: `Keyboard scroll filler ${i} ${getRandomId()}`});
        }
        const incomingMessage = `Incoming message ${getRandomId()}`;
        await Post.apiCreatePost(siteOneUrl, {channelId: testChannel.id, message: incomingMessage});
        const {post: incomingPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);

        // # Open channel screen and tap post input to open the keyboard
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postInput.tap();
        await wait(timeouts.ONE_SEC);

        // * Verify the latest post is visible at the bottom even with the keyboard open
        const {postListPostItem} = ChannelScreen.getPostListPostItem(incomingPost.id, incomingMessage);
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
