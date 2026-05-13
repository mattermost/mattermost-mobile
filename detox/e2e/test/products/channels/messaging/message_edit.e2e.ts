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
    EditPostScreen,
    HomeScreen,
    LoginScreen,
    PostOptionsScreen,
    ServerScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Messaging - Message Edit', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
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

    it('MM-T4783_1 - should be able to edit a post message and save', async () => {
        // # Open a channel screen and post a message
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);

        // * Verify message is added to post list
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: originalPostListPostItem} = ChannelScreen.getPostListPostItem(post.id, message);
        await waitFor(originalPostListPostItem).toBeVisible().withTimeout(timeouts.FOUR_SEC);

        // # Scroll the post list (not the post item) to dismiss the keyboard and ensure post is tappable
        await ChannelScreen.getFlatPostList().scroll(100, 'up', 0.5, 0.5);

        // # Open post options for the message that was just posted and tap edit option
        await ChannelScreen.openPostOptionsFor(post.id, message);
        await PostOptionsScreen.editPostOption.tap();

        // * Verify on edit post screen
        await EditPostScreen.toBeVisible();

        // # Edit post message and tap save button
        const updatedMessage = `${message} edit`;
        await EditPostScreen.messageInput.replaceText(updatedMessage);
        await EditPostScreen.saveButton.tap();

        await expect(EditPostScreen.editPostScreen).not.toBeVisible();

        // # Scroll the post list to dismiss keyboard and ensure the edited post is fully visible.
        // On iOS the keyboard + channel intro header can push the post below the 75% visibility
        // threshold, causing toBeVisible() to fail.
        await ChannelScreen.getFlatPostList().scroll(100, 'up', 0.5, 0.5);
        await wait(timeouts.ONE_SEC);

        const {postListPostItem: updatedPostListPostItem} = ChannelScreen.getPostListPostItem(post.id);
        await expect(updatedPostListPostItem).toBeVisible();

        await ChannelScreen.assertPostMessageEdited(post.id, updatedMessage);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T4783_2 - should be able to edit a post message and cancel', async () => {
        // # Open a channel screen and post a message
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);

        // * Verify message is added to post list
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, message);
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.FOUR_SEC);

        // # Scroll the post list (not the post item) to dismiss the keyboard and ensure post is tappable
        await ChannelScreen.getFlatPostList().scroll(100, 'up', 0.5, 0.5);

        // # Open post options for the message that was just posted and tap edit option
        await ChannelScreen.openPostOptionsFor(post.id, message);
        await PostOptionsScreen.editPostOption.tap();

        // * Verify on edit post screen
        await EditPostScreen.toBeVisible();

        // # Edit post message and tap close button
        const updatedMessage = `${message} edit`;
        await EditPostScreen.messageInput.replaceText(updatedMessage);
        await EditPostScreen.closeButton.tap();

        // # Scroll the post list to dismiss keyboard and ensure the post is fully visible.
        // On iOS the keyboard + channel intro header can push the post below the 75% visibility
        // threshold, causing toBeVisible() to fail.
        await ChannelScreen.getFlatPostList().scroll(100, 'up', 0.5, 0.5);
        await wait(timeouts.ONE_SEC);

        // * Verify post message is not updated
        await expect(postListPostItem).toBeVisible();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T4783_3 - should be able to edit a post message from reply thread', async () => {
        // # Open a channel screen, post a message, and tap on the post to open reply thread
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);
        const {post: parentPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: parentPostListPostItem} = ChannelScreen.getPostListPostItem(parentPost.id, message);

        // # Scroll the post list (not the post item) to dismiss the keyboard before tapping
        await ChannelScreen.getFlatPostList().scroll(100, 'up', 0.5, 0.5);
        await wait(timeouts.ONE_SEC);
        await parentPostListPostItem.tap();

        // * Verify on thread screen
        await ThreadScreen.toBeVisible();

        // # Post a reply, open post options for the reply message and tap edit option
        const replyMessage = `${message} reply`;
        await ThreadScreen.postMessage(replyMessage);
        const {post: replyPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);

        // # Scroll the thread post list (not the post item) to dismiss keyboard before long press
        await ThreadScreen.getFlatPostList().scroll(100, 'up', 0.5, 0.5);
        await ThreadScreen.openPostOptionsFor(replyPost.id, replyMessage);
        await PostOptionsScreen.editPostOption.tap();

        // * Verify on edit post screen
        await EditPostScreen.toBeVisible();

        // # Edit reply post message and tap save button
        const updatedReplyMessage = `${replyMessage} edit`;
        await EditPostScreen.messageInput.replaceText(updatedReplyMessage);
        await EditPostScreen.saveButton.tap();

        await expect(EditPostScreen.editPostScreen).not.toBeVisible();

        // # Scroll the thread post list to dismiss keyboard and ensure the edited reply is fully visible.
        // On iOS the keyboard can push the reply post below the visibility threshold or make it
        // not hittable at its visible point.
        await ThreadScreen.getFlatPostList().scroll(100, 'up', 0.5, 0.5);
        await wait(timeouts.ONE_SEC);

        // * Verify reply post message is updated and displays edited indicator '(edited)'
        const {postListPostItem: updatedReplyPostListPostItem} = ThreadScreen.getPostListPostItem(replyPost.id);
        await expect(updatedReplyPostListPostItem).toBeVisible();

        await ChannelScreen.assertPostMessageEdited(replyPost.id, updatedReplyMessage, 'thread_page');

        // # Go back to channel list screen
        await ThreadScreen.back();
        await ChannelScreen.back();
    });
});
