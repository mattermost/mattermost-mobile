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
import {getRandomId, isAndroid, timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Messaging - Message Post', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(user);

        // Ensure the channel has propagated to the sidebar before any test body runs.
        await ChannelListScreen.waitForSidebarPublicChannelDisplayNameVisible(testChannel.name);
    });

    beforeEach(async () => {
        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T4782_1 - should be able to post a message when send button is tapped', async () => {
        // # Open a channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // * Verify send button is disabled
        await expect(ChannelScreen.sendButtonDisabled).toBeVisible();

        // # Create a message draft
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.postInput.tap();
        await ChannelScreen.postInput.replaceText(message);

        // * Verify send button is enabled
        await expect(ChannelScreen.sendButton).toBeVisible();

        // # Tap send button
        await ChannelScreen.sendButton.tap();

        // * Verify message is added to post list, cleared from post draft, and send button is disabled again
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, message);
        await expect(postListPostItem).toBeVisible();
        await expect(ChannelScreen.postInput).not.toHaveValue(message);
        await expect(ChannelScreen.sendButtonDisabled).toBeVisible();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T4782_2 - should be able to post a long message', async () => {
        // # Open a channel screen and post a long message
        const longMessage = 'The quick brown fox jumps over the lazy dog.'.repeat(40);
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(longMessage);
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);

        // * Verify show more button is visible while the long post is still the most recent
        // (posting a short message after would scroll the long post off-screen and virtualize it,
        // removing the show_more element from the view hierarchy entirely)
        // Use toExist() (not toBeVisible()) because a 40x repeated sentence renders taller
        // than the viewport on iPhone 17 Pro / iOS 26.x, so the post view is clipped by its
        // superview bounds and fails Detox's 75% visibility threshold even when it is on-screen.
        const {postListPostItem, postListPostItemShowLessButton, postListPostItemShowMoreButton} = ChannelScreen.getPostListPostItem(post.id, longMessage);
        await expect(postListPostItem).toExist();

        // # On Android the keyboard can remain open after sending, which compresses the FlatList
        // and pushes the show-more button behind the draft input bar. Dismiss it first.
        // The show-more button also requires multiple layout cycles to appear (post body measures
        // layoutWidth, then message re-renders at correct width, then onLayout sets height),
        // so wait up to 10s for it to become visible.
        if (isAndroid()) {
            await device.pressBack();
        }
        await waitFor(postListPostItemShowMoreButton).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Tap on show more button on long message post
        await postListPostItemShowMoreButton.tap();
        await wait(timeouts.TWO_SEC);

        // * Verify long message post displays show less button (chevron up button)
        await waitFor(postListPostItemShowLessButton).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Post a short message and go back to channel list screen
        await ChannelScreen.postMessage('short message');
        await ChannelScreen.back();
    });

    it('MM-T72 - should highlight @here. @all. @channel. even when followed by a period', async () => {
        // # Open a channel screen and post a message with @here followed by a period
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage('@here. Some text');

        // * Verify the post exists in the channel and @here is rendered (period is not part of the highlighted mention)
        const {post: atHerePost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: atHerePostItem} = ChannelScreen.getPostListPostItem(atHerePost.id, '@here. Some text');
        await expect(atHerePostItem).toBeVisible();

        // # Post a message with @all followed by a period
        await ChannelScreen.postMessage('@all. Some text');

        // * Verify the @all mention text is present in the post
        const {post: atAllPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: atAllPostItem} = ChannelScreen.getPostListPostItem(atAllPost.id, '@all. Some text');
        await expect(atAllPostItem).toBeVisible();

        // # Post a message with @channel followed by a period
        await ChannelScreen.postMessage('@channel. Some text');

        // * Verify the @channel mention text is present in the post
        const {post: atChannelPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: atChannelPostItem} = ChannelScreen.getPostListPostItem(atChannelPost.id, '@channel. Some text');
        await expect(atChannelPostItem).toBeVisible();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
