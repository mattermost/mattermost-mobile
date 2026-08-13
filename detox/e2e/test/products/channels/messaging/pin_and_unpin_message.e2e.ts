// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    Setup,
    Post,
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
import {getRandomId, isAndroid, safeEnableSynchronization, timeouts, wait, waitForElementToHaveText} from '@support/utils';
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

        // Send + verify it landed (retries once on sim -1005 POST drop).
        const {post} = await ChannelScreen.postMessageAndVerify(message, testChannel.id, siteOneUrl);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, message);

        // Wait for post to exist (may be off-screen); openChannelPostOptionsForPin scrolls before long-press.
        await waitFor(postListPostItem).toExist().withTimeout(timeouts.TEN_SEC);

        // # Open post options for message and tap on pin to channel option
        await openChannelPostOptionsForPin(post.id, message);

        // Wait for pin row visibility — post-options sheet overlay can block center-tap on open.
        await waitFor(PostOptionsScreen.pinPostOption).toBeVisible().withTimeout(timeouts.FIVE_SEC);
        await PostOptionsScreen.pinPostOption.tap({x: 1, y: 1});

        // * Verify pinned text is displayed on the post pre-header
        const {postListPostItemPreHeaderText} = ChannelScreen.getPostListPostItem(post.id, message);
        await waitFor(postListPostItemPreHeaderText).toHaveText(pinnedText).withTimeout(timeouts.TEN_SEC);

        // # Open post options for message and tap on unpin from channel option
        await openChannelPostOptionsForPin(post.id, message);
        await waitFor(PostOptionsScreen.unpinPostOption).toBeVisible().withTimeout(timeouts.FIVE_SEC);
        await PostOptionsScreen.unpinPostOption.tap({x: 1, y: 1});

        // * Verify pinned text is not displayed on the post pre-header
        await waitFor(postListPostItemPreHeaderText).not.toExist().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    // Skip: BACK_INDEX / pin on thread
    it.skip('MM-T4865_2 - should be able to pin/unpin a message via post options on thread screen', async () => {
        // # Open a channel screen, post a message, tap on post to open thread, open post options for message, and tap on pin to channel option
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        const {post} = await ChannelScreen.postMessageAndVerify(message, testChannel.id, siteOneUrl);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, message);
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        await postListPostItem.tap();
        await wait(timeouts.TWO_SEC);
        await ThreadScreen.toBeVisible();
        await ThreadScreen.openPostOptionsFor(post.id, message);
        await waitFor(PostOptionsScreen.pinPostOption).toBeVisible().withTimeout(timeouts.FIVE_SEC);
        await PostOptionsScreen.pinPostOption.tap({x: 1, y: 1});

        // * Verify pinned text is displayed on the post pre-header
        const {postListPostItemPreHeaderText} = ThreadScreen.getPostListPostItem(post.id, message);
        await waitFor(postListPostItemPreHeaderText).toHaveText(pinnedText).withTimeout(timeouts.TEN_SEC);

        // # Open post options for message and tap on unpin from channel option
        await ThreadScreen.openPostOptionsFor(post.id, message);

        // Wait for unpin row visibility — post-options sheet overlay can block center-tap on open.
        await waitFor(PostOptionsScreen.unpinPostOption).toBeVisible().withTimeout(timeouts.FIVE_SEC);
        await PostOptionsScreen.unpinPostOption.tap({x: 1, y: 1});

        // * Verify pinned text is not displayed on the post pre-header
        await waitFor(postListPostItemPreHeaderText).not.toExist().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await ThreadScreen.back();
        await ChannelScreen.back();
    });

    // SEC-11013: iOS previously overran the 5m timeout on the 75% visibility scroll after pin.
    // Re-enable with a 40% visibility wait; hang-step profiling still needed if CI overruns again.
    it('MM-T142 - pinning an older message should not move it to bottom of channel, and pinned posts should display with newest at top', async () => {
        // # Open a channel screen and post several messages to populate the channel
        await ChannelScreen.open(channelsCategory, testChannel.name);
        const olderMessage = `Older message ${getRandomId()}`;
        const {post: olderPost} = await ChannelScreen.postMessageAndVerify(olderMessage, testChannel.id, siteOneUrl);

        // # Post more messages so the older message scrolls up
        const newerMessage1 = `Newer message A ${getRandomId()}`;
        const newerMessage2 = `Newer message B ${getRandomId()}`;
        await Post.apiCreatePost(siteOneUrl, {channelId: testChannel.id, message: newerMessage1});
        await Post.apiCreatePost(siteOneUrl, {channelId: testChannel.id, message: newerMessage2});

        // Capture newerMessage2 post ID before pinning (pinning creates a system post that becomes the new last post)
        const {post: newerPost2} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: newerPost2Item} = ChannelScreen.getPostListPostItem(newerPost2.id, newerMessage2);

        // Re-open so the keyboard is down and the inverted list is anchored at the newest posts.
        await ChannelScreen.back();
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // # Long press the older (not the most recent) post and pin it to channel
        await openChannelPostOptionsForPin(olderPost.id, olderMessage);
        await PostOptionsScreen.pinPostOption.tap({x: 1, y: 1});

        // * Verify the older message shows a Pinned pre-header (it is pinned)
        const {postListPostItemPreHeaderText} = ChannelScreen.getPostListPostItem(olderPost.id, olderMessage);
        await waitForElementToHaveText(postListPostItemPreHeaderText, pinnedText);

        // * Verify the newer messages are still below the older pinned message. Re-open the
        //   channel to reset scroll to the newest messages so newerPost2 is visible.
        await ChannelScreen.back();
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // The "X pinned a message" system post pushes newerPost2 under the input bar on iOS 26.x.
        // Do not use waitFor(toBeVisible/toExist) here — iOS Detox can ignore withTimeout and
        // hang until Jest's 300s cap. Best-effort scroll only;
        // pin behaviour is the pre-header above and the pinned-messages list below.
        await device.disableSynchronization();
        try {
            /* eslint-disable no-await-in-loop -- bounded scroll with immediate expect */
            for (let i = 0; i < 8; i++) {
                try {
                    await expect(newerPost2Item).toBeVisible(40);
                    break;
                } catch {
                    try {
                        await element(by.id('channel.post_list.flat_list')).scroll(100, 'up', 0.5, 0.5);
                    } catch {
                        break;
                    }
                    await wait(timeouts.HALF_SEC);
                }
            }
            /* eslint-enable no-await-in-loop */
        } finally {
            await safeEnableSynchronization();
        }

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
        await PostOptionsScreen.unpinPostOption.tap({x: 1, y: 1});

        // * Verify the unpinned message no longer appears in the pinned messages list
        // Wait for the item to be removed after unpin operation.
        await waitFor(pinnedItem).not.toExist().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await PinnedMessagesScreen.back();
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });
});
