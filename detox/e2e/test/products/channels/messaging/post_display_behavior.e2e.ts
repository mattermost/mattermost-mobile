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
        await ChannelScreen.postMessage(firstMessage);
        const {post: firstPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);

        // # Post second consecutive message as the same user
        const secondMessage = `Second message ${getRandomId()}`;
        await ChannelScreen.postMessage(secondMessage);
        const {post: secondPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);

        // * Verify first post has a display name header
        const {postListPostItemHeaderDisplayName: firstPostHeader} = ChannelScreen.getPostListPostItem(firstPost.id, firstMessage);
        await expect(firstPostHeader).toExist();

        // * Verify second consecutive post does NOT show the display name again
        const {postListPostItemHeaderDisplayName: secondPostHeader} = ChannelScreen.getPostListPostItem(secondPost.id, secondMessage);
        await expect(secondPostHeader).not.toExist();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T216_1 - should scroll to bottom when sending a message after scrolling up', async () => {
        // # Create many posts via API to fill the channel history and enable scrolling
        for (let i = 0; i < 20; i++) {
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

        // # Scroll up from mid-screen (bottom edge is occluded by the post-draft input on iOS).
        // In increments rather than one 5000px drag: a single long synthetic drag dwells on the
        // post under the start point long enough for its long-press handler to fire, which opens
        // the post-options sheet over the draft input and makes the send below fail the 100%
        // visibility check. Every other post-list scroll in this suite uses 50–300px.
        for (let i = 0; i < 6; i++) {
            try {
                // eslint-disable-next-line no-await-in-loop
                await ChannelScreen.getFlatPostList().scroll(500, 'up', 0.5, 0.5);
            } catch {
                // Detox throws when a scroll begins at the content edge — we are at the top.
                break;
            }
        }
        await wait(timeouts.ONE_SEC);

        // # Close the post-options sheet if a scroll gesture still tripped a long press —
        // Detox gesture timing under CI load is outside this test's control, and the sheet
        // would otherwise occlude the draft input and fail the send with an opaque
        // "view is not visible" error. Probe-and-recover, matching dismissKnownModals().
        // Runs before the assertion below so an open sheet cannot make it pass by occlusion.
        try {
            await waitFor(PostOptionsScreen.postOptionsScreen).toExist().withTimeout(timeouts.HALF_SEC);
            await PostOptionsScreen.close();
        } catch {
            // Expected path: no sheet was opened by the scroll.
        }

        // * Verify the list actually left the bottom, so the scroll-to-bottom check below is
        // not vacuously true if the scroll gesture silently did nothing.
        await expect(lastFillerItem).not.toBeVisible();

        // # Send a new message from the UI
        const newMessage = `New bottom message ${getRandomId()}`;
        await ChannelScreen.postMessage(newMessage);

        // * Verify the new message is visible (view scrolled to bottom)
        const {post: lastPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
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
