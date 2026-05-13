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
    EditPostScreen,
    LoginScreen,
    PermalinkScreen,
    PostOptionsScreen,
    PinnedMessagesScreen,
    SavedMessagesScreen,
    ServerScreen,
    ThreadScreen,
    ChannelInfoScreen,
} from '@support/ui/screen';
import {getRandomId, isAndroid, timeouts, wait, waitForElementToBeVisible} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Search - Pinned Messages', () => {
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

    it('MM-T4918_1 - should match elements on pinned messages screen', async () => {
        // # Open a channel screen, open channel info screen, and open pinned messages screen
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelInfoScreen.open();
        await PinnedMessagesScreen.open();

        // * Verify basic elements on pinned messages screen
        // On Android the bridge stays busy during the screen transition + ActivityIndicator
        // spinner animation + fetchPinnedPosts I/O, so waitFor().toBeVisible() never fires
        // (BridgeIdlingResource timeout). Use the polling helper instead on Android.
        const emptyTitleElement = element(by.text('No pinned messages yet'));
        if (isAndroid()) {
            await waitForElementToBeVisible(emptyTitleElement, timeouts.TWENTY_SEC);
        } else {
            await waitFor(emptyTitleElement).toBeVisible().withTimeout(timeouts.FOUR_SEC);
        }
        await expect(PinnedMessagesScreen.emptyTitle).toHaveText('No pinned messages yet');
        await expect(PinnedMessagesScreen.emptyParagraph).toHaveText('To pin important messages, long-press on a message and choose Pin To Channel. Pinned messages will be visible to everyone in this channel.');

        // # Go back to channel list screen
        await PinnedMessagesScreen.back();
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T4918_2 - should be able to display a pinned message in pinned messages screen and navigate to message channel', async () => {
        // # Open a channel screen, post a message, open post options for message, and tap on pin to channel option
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);

        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: channelPostItem} = ChannelScreen.getPostListPostItem(post.id, message);
        await expect(channelPostItem).toBeVisible();

        await ChannelScreen.openPostOptionsFor(post.id, message);
        await PostOptionsScreen.pinPostOption.tap();

        // * Verify pinned text is displayed on the post pre-header
        await wait(timeouts.ONE_SEC);
        const {postListPostItemPreHeaderText} = ChannelScreen.getPostListPostItem(post.id, message);
        await expect(postListPostItemPreHeaderText).toHaveText(pinnedText);

        // # Open channel info screen and open pinned messages screen
        await ChannelInfoScreen.open();
        await PinnedMessagesScreen.open();

        // * Verify on pinned messages screen and pinned message is displayed
        await PinnedMessagesScreen.toBeVisible();
        const {postListPostItem: pinnedMessagesPostListPostItem} = PinnedMessagesScreen.getPostListPostItem(post.id, message);
        await expect(pinnedMessagesPostListPostItem).toBeVisible();

        // # Tap on post and jump to recent messages
        // jumpToRecentMessages() already waits for the button to exist before tapping,
        // so the redundant waitFor() call here is not needed and would block on
        // BridgeIdlingResource on Android during the permalink navigation animation.
        await pinnedMessagesPostListPostItem.tap();
        await PermalinkScreen.jumpToRecentMessages();

        // * Verify on channel screen and pinned message is displayed
        await ChannelScreen.toBeVisible();
        const {postListPostItem: channelPostListPostItem} = ChannelScreen.getPostListPostItem(post.id, message);
        await expect(channelPostListPostItem).toBeVisible();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T4918_3 - should be able to edit, reply to, and delete a pinned message from pinned messages screen', async () => {
        // # Open a channel screen, post a message, open post options for message, tap on pin to channel option, open channel info screen, and open pinned messages screen
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);
        const {post: pinnedPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: channelPostItem} = ChannelScreen.getPostListPostItem(pinnedPost.id, message);
        await expect(channelPostItem).toBeVisible();

        await ChannelScreen.openPostOptionsFor(pinnedPost.id, message);
        await PostOptionsScreen.pinPostOption.tap();
        await ChannelInfoScreen.open();
        await PinnedMessagesScreen.open();

        // * Verify on pinned messages screen
        await PinnedMessagesScreen.toBeVisible();

        // # Open post options for pinned message and tap on edit option
        await PinnedMessagesScreen.openPostOptionsFor(pinnedPost.id, message);
        await PostOptionsScreen.editPostOption.tap();

        // * Verify on edit post screen
        await EditPostScreen.toBeVisible();

        // # Edit post message and tap save button
        const updatedMessage = `${message} edit`;
        await EditPostScreen.messageInput.replaceText(updatedMessage);
        await EditPostScreen.saveButton.tap();

        // * Verify post message is updated and displays edited indicator '(edited)'
        const {postListPostItem: updatedPostListPostItem} = PinnedMessagesScreen.getPostListPostItem(pinnedPost.id);

        // On Android the bridge stays busy during DB writes from the edit response,
        // so waitFor().toBeVisible() blocks on BridgeIdlingResource. Use polling instead.
        if (isAndroid()) {
            await waitForElementToBeVisible(updatedPostListPostItem, timeouts.TEN_SEC);
        } else {
            await waitFor(updatedPostListPostItem).toBeVisible().withTimeout(timeouts.FOUR_SEC);
        }
        await ChannelScreen.assertPostMessageEdited(pinnedPost.id, updatedMessage, 'pinned_page');

        // # Open post options for updated pinned message and tap on reply option
        await PostOptionsScreen.openPostOptionsForPinedPosts(pinnedPost.id);
        await PostOptionsScreen.replyPostOption.tap();

        // * Verify on thread screen
        await ThreadScreen.toBeVisible();

        // # Post a reply
        const replyMessage = `${updatedMessage} reply`;
        await ThreadScreen.postMessage(replyMessage);

        // * Verify reply is posted
        const {post: replyPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: replyPostListPostItem} = ThreadScreen.getPostListPostItem(replyPost.id, replyMessage);
        await expect(replyPostListPostItem).toBeVisible();

        // # Go back to pinned messages screen
        await ThreadScreen.back();

        // * Verify reply count and following button
        // On Android the WatermelonDB observer + React re-render cycle after the
        // isFollowing DB write can take a few hundred ms on CI emulators.
        // Give the UI a moment to settle before polling.
        if (isAndroid()) {
            await wait(timeouts.TWO_SEC);
        }
        const {postListPostItem} = PinnedMessagesScreen.getPostListPostItem(pinnedPost.id, updatedMessage);
        await PinnedMessagesScreen.verifyReplyCount(pinnedPost.id, 1);
        await PinnedMessagesScreen.verifyFollowingLabel(pinnedPost.id, true);

        // # Open post options for updated pinned message and delete post
        await PostOptionsScreen.openPostOptionsForPinedPosts(pinnedPost.id);
        await PostOptionsScreen.deletePost({confirm: true});

        // * Verify updated pinned message is deleted
        await expect(postListPostItem).not.toExist();

        // # Go back to channel list screen
        await PinnedMessagesScreen.back();
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T4918_4 - should be able to unpin a message from pinned messages screen', async () => {
        // # Open a channel screen, post a message, open post options for message, tap on pin to channel option, open channel info screen, and open pinned messages screen
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);

        const {post: pinnedPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: channelPostItem} = ChannelScreen.getPostListPostItem(pinnedPost.id, message);
        await expect(channelPostItem).toBeVisible();

        await ChannelScreen.openPostOptionsFor(pinnedPost.id, message);
        await PostOptionsScreen.pinPostOption.tap();
        await ChannelInfoScreen.open();
        await PinnedMessagesScreen.open();

        // * Verify on pinned messages screen
        await PinnedMessagesScreen.toBeVisible();

        // # Open post options for pinned message and tap on unpin from channel option
        await PinnedMessagesScreen.openPostOptionsFor(pinnedPost.id, message);
        await PostOptionsScreen.unpinPostOption.tap();

        // * Verify pinned message is not displayed anymore
        await wait(timeouts.ONE_SEC);
        const {postListPostItem} = PinnedMessagesScreen.getPostListPostItem(pinnedPost.id, message);
        await expect(postListPostItem).not.toExist();

        // # Go back to channel list screen
        await PinnedMessagesScreen.back();
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T4918_5 - should be able to save/unsave a pinned message from pinned messages screen', async () => {
        // # Open a channel screen, post a message, open post options for message, tap on pin to channel option, open channel info screen, and open pinned messages screen
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);

        const {post: pinnedPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: channelPostItem} = ChannelScreen.getPostListPostItem(pinnedPost.id, message);
        await expect(channelPostItem).toBeVisible();

        await ChannelScreen.openPostOptionsFor(pinnedPost.id, message);
        await PostOptionsScreen.pinPostOption.tap();
        await ChannelInfoScreen.open();
        await PinnedMessagesScreen.open();

        // * Verify on pinned messages screen
        await PinnedMessagesScreen.toBeVisible();

        // # Open post options for pinned message, tap on save option, go back to channel list screen, and open saved messages screen
        await PinnedMessagesScreen.openPostOptionsFor(pinnedPost.id, message);
        await PostOptionsScreen.savePostOption.tap();
        await PinnedMessagesScreen.back();
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
        await SavedMessagesScreen.open();

        // * Verify pinned message is displayed on saved messages screen
        const {postListPostItem} = SavedMessagesScreen.getPostListPostItem(pinnedPost.id, message);
        await expect(postListPostItem).toBeVisible();

        // # Go back to pinned messages screen, open post options for pinned message, tap on usave option, go back to channel list screen, and open saved messages screen
        await ChannelListScreen.open();
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelInfoScreen.open();
        await PinnedMessagesScreen.open();
        await PinnedMessagesScreen.openPostOptionsFor(pinnedPost.id, message);
        await PostOptionsScreen.unsavePostOption.tap();
        await PinnedMessagesScreen.back();
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
        await SavedMessagesScreen.open();
        await wait(timeouts.TWO_SEC);

        // * Verify pinned message is not displayed anymore on saved messages screen
        await expect(postListPostItem).not.toExist();

        // # Go back to channel list screen
        await ChannelListScreen.open();
    });
});
