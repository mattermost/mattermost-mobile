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
    ChannelInfoScreen,
    ChannelListScreen,
    ChannelScreen,
    HomeScreen,
    LoginScreen,
    PinnedMessagesScreen,
    PostOptionsScreen,
    ServerScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {getRandomId, isAndroid, timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

async function openChannelPostOptionsForPin(postId: string, message: string) {
    if (!isAndroid()) {
        await ChannelScreen.openPostOptionsFor(postId, message);
        return;
    }

    const flatList = ChannelScreen.getFlatPostList();
    const target = element(
        by.text(message).withAncestor(by.id(`channel.post_list.post.${postId}`)),
    );

    await waitFor(target).toBeVisible().withTimeout(timeouts.TEN_SEC);

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            // eslint-disable-next-line no-await-in-loop
            await flatList.scroll(100, 'down', 0.5, 0.5);
        } catch {
            // Ignore scroll failures at list boundaries.
        }

        // eslint-disable-next-line no-await-in-loop
        await wait(timeouts.THREE_SEC);
        // eslint-disable-next-line no-await-in-loop
        await target.longPress(timeouts.FIVE_SEC);

        try {
            // eslint-disable-next-line no-await-in-loop
            await waitFor(PostOptionsScreen.postOptionsScreen).toExist().withTimeout(timeouts.TEN_SEC);
            // eslint-disable-next-line no-await-in-loop
            await wait(timeouts.TWO_SEC);
            return;
        } catch {
            if (attempt === 3) {
                throw new Error(`Post options did not appear for "${message}" after ${attempt} attempts`);
            }
        }
    }
}

async function expectPinnedPostAbove(upperPostId: string, upperMessage: string, lowerPostId: string, lowerMessage: string) {
    const {postListPostItem: upperItem} = PinnedMessagesScreen.getPostListPostItem(upperPostId, upperMessage);
    const {postListPostItem: lowerItem} = PinnedMessagesScreen.getPostListPostItem(lowerPostId, lowerMessage);

    await expect(upperItem).toBeVisible();
    await expect(lowerItem).toBeVisible();

    const upperAttributes = await upperItem.getAttributes();
    const lowerAttributes = await lowerItem.getAttributes();
    const upperY = 'frame' in upperAttributes && upperAttributes.frame ? upperAttributes.frame.y : null;
    const lowerY = 'frame' in lowerAttributes && lowerAttributes.frame ? lowerAttributes.frame.y : null;

    if (typeof upperY !== 'number' || typeof lowerY !== 'number') {
        throw new Error('Unable to determine pinned post positions');
    }

    if (upperY >= lowerY) {
        throw new Error(`Expected "${upperMessage}" to appear above "${lowerMessage}"`);
    }
}

describe('Messaging - Pin and Unpin Message', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    const pinnedText = 'Pinned';
    let testChannel: any;

    beforeAll(async () => {
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

    it('MM-T4865_1 - should be able to pin/unpin a message via post options on channel screen', async () => {
        // # Open a channel screen and post a message
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);

        // * Verify message is posted
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, message);
        await expect(postListPostItem).toBeVisible();

        // # Open post options for message and tap on pin to channel option
        await openChannelPostOptionsForPin(post.id, message);
        await PostOptionsScreen.pinPostOption.tap();

        // * Verify pinned text is displayed on the post pre-header
        // Use polling to wait for the pre-header to appear after pin operation.
        // On Android the bridge stays busy during bottom sheet dismissal + network
        // request + DB update + re-render, so a fixed wait() is unreliable.
        const {postListPostItemPreHeaderText} = ChannelScreen.getPostListPostItem(post.id, message);
        await waitFor(postListPostItemPreHeaderText).toHaveText(pinnedText).withTimeout(timeouts.TEN_SEC);

        // # Open post options for message and tap on unpin from channel option
        await openChannelPostOptionsForPin(post.id, message);
        await PostOptionsScreen.unpinPostOption.tap();

        // * Verify pinned text is not displayed on the post pre-header
        // Wait for the pre-header element to disappear after unpin operation.
        await waitFor(postListPostItemPreHeaderText).not.toExist().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T4865_2 - should be able to pin/unpin a message via post options on thread screen', async () => {
        // # Open a channel screen, post a message, tap on post to open thread, open post options for message, and tap on pin to channel option
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);

        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, message);
        await expect(postListPostItem).toBeVisible();

        await postListPostItem.tap();
        await wait(timeouts.TWO_SEC);
        await ThreadScreen.toBeVisible();
        await ThreadScreen.openPostOptionsFor(post.id, message);
        await PostOptionsScreen.pinPostOption.tap();

        // * Verify pinned text is displayed on the post pre-header
        // Use polling to wait for the pre-header to appear after pin operation.
        const {postListPostItemPreHeaderText} = ThreadScreen.getPostListPostItem(post.id, message);
        await waitFor(postListPostItemPreHeaderText).toHaveText(pinnedText).withTimeout(timeouts.TEN_SEC);

        // # Open post options for message and tap on unpin from channel option
        await ThreadScreen.openPostOptionsFor(post.id, message);
        await PostOptionsScreen.unpinPostOption.tap();

        // * Verify pinned text is not displayed on the post pre-header
        // Wait for the pre-header element to disappear after unpin operation.
        await waitFor(postListPostItemPreHeaderText).not.toExist().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await ThreadScreen.back();
        await ChannelScreen.back();
    });

    it('MM-T142 - pinning an older message should not move it to bottom of channel, and pinned posts should display with newest at top', async () => {
        // # Open a channel screen and post several messages to populate the channel
        await ChannelScreen.open(channelsCategory, testChannel.name);
        const olderMessage = `Older message ${getRandomId()}`;
        await ChannelScreen.postMessage(olderMessage);
        const {post: olderPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);

        // # Post more messages so the older message scrolls up
        const newerMessage1 = `Newer message A ${getRandomId()}`;
        const newerMessage2 = `Newer message B ${getRandomId()}`;
        await Post.apiCreatePost(siteOneUrl, {channelId: testChannel.id, message: newerMessage1});
        await Post.apiCreatePost(siteOneUrl, {channelId: testChannel.id, message: newerMessage2});

        // Capture newerMessage2 post ID before pinning (pinning creates a system post that becomes the new last post)
        const {post: newerPost2} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: newerPost2Item} = ChannelScreen.getPostListPostItem(newerPost2.id, newerMessage2);

        // # Long press the older (not the most recent) post and pin it to channel
        await openChannelPostOptionsForPin(olderPost.id, olderMessage);
        await PostOptionsScreen.pinPostOption.tap();

        // * Verify the older message shows a Pinned pre-header (it is pinned)
        // Use polling to wait for the pre-header to appear after pin operation.
        const {postListPostItemPreHeaderText} = ChannelScreen.getPostListPostItem(olderPost.id, olderMessage);
        await waitFor(postListPostItemPreHeaderText).toHaveText(pinnedText).withTimeout(timeouts.TEN_SEC);

        // * Verify the newer messages are still in the channel below the older pinned message.
        //   (i.e. the older message was not moved to the bottom of the channel)
        //   Re-open the channel to reset scroll to newest messages, ensuring newerPost2 is visible.
        await ChannelScreen.back();
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // Scroll up slightly to bring newerPost2 into the fully visible area.
        // After pinning, a system post ("X pinned a message") is added, pushing
        // newerPost2 down where the message input bar clips it below the 75%
        // visibility threshold on iOS 26.x (safe area insets reduce visible area).
        try {
            await ChannelScreen.getFlatPostList().scroll(100, 'up', 0.5, 0.5);
        } catch { /* list may be too short */ }
        await expect(newerPost2Item).toBeVisible();

        // # Open channel info and navigate to pinned messages screen
        await ChannelInfoScreen.open();
        await PinnedMessagesScreen.open();

        // * Verify pinned messages screen is visible and shows the pinned message
        await PinnedMessagesScreen.toBeVisible();
        const {postListPostItem: pinnedItem} = PinnedMessagesScreen.getPostListPostItem(olderPost.id, olderMessage);
        await expect(pinnedItem).toBeVisible();

        // # Pin a second post via API to verify newest-at-top ordering in pinned list
        const secondMessage = `Second pinned ${getRandomId()}`;
        await Post.apiCreatePost(siteOneUrl, {channelId: testChannel.id, message: secondMessage});
        const {post: secondPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);

        // # Go back to channel and pin the second post via API
        await PinnedMessagesScreen.back();
        await ChannelInfoScreen.close();
        await Post.apiPinPost(siteOneUrl, secondPost.id);

        // # Open pinned messages screen again
        await ChannelInfoScreen.open();
        await PinnedMessagesScreen.open();
        await PinnedMessagesScreen.toBeVisible();

        // * Verify the second (newer) pinned message appears above the first (older) pinned message
        await expectPinnedPostAbove(secondPost.id, secondMessage, olderPost.id, olderMessage);

        // # Unpin the older message from the pinned messages screen
        await PinnedMessagesScreen.openPostOptionsFor(olderPost.id, olderMessage);
        await PostOptionsScreen.unpinPostOption.tap();

        // * Verify the unpinned message no longer appears in the pinned messages list
        // Wait for the item to be removed after unpin operation.
        await waitFor(pinnedItem).not.toExist().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await PinnedMessagesScreen.back();
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });
});
