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
    GlobalThreadsScreen,
    HomeScreen,
    LoginScreen,
    PermalinkScreen,
    ServerScreen,
    ThreadOptionsScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Smoke Test - Threads', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    const savedText = 'Saved';
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

    it('MM-T4811_1 - should be able to create a thread, follow/unfollow a thread, mark a thread as read/unread, and reply to thread', async () => {
        // # Create a thread and unfollow thread via thread navigation
        const parentMessage = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await waitFor(ChannelScreen.postInput).toBeVisible().withTimeout(timeouts.FOUR_SEC);
        await ChannelScreen.postMessage(parentMessage);
        const {post: parentPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.openReplyThreadFor(parentPost.id, parentMessage);
        await waitFor(ThreadScreen.postInput).toBeVisible().withTimeout(timeouts.FOUR_SEC);
        await ThreadScreen.postMessage(`${parentMessage} reply`);
        await ThreadScreen.followingButton.tap();

        // * Verify thread is not followed by user via thread navigation
        await expect(ThreadScreen.followButton).toBeVisible();

        // # Follow thread via thread navigation
        await ThreadScreen.followButton.tap();

        // * Verify thread is followed by user via thread navigation
        await expect(ThreadScreen.followingButton).toBeVisible();

        // # Go back to channel list screen, then go to global threads screen, tap on all your threads button, open thread options for thread, tap on mark as unread option, and tap on unread threads button
        await ThreadScreen.back();
        await ChannelScreen.back();
        await device.reloadReactNative();
        await GlobalThreadsScreen.open();
        await GlobalThreadsScreen.headerAllThreadsButton.tap();
        await GlobalThreadsScreen.openThreadOptionsFor(parentPost.id);
        await ThreadOptionsScreen.markAsUnreadOption.tap();
        await GlobalThreadsScreen.headerUnreadThreadsButton.tap();

        // * Verify thread is displayed in unread threads section
        await expect(GlobalThreadsScreen.getThreadItem(parentPost.id)).toBeVisible();

        // # Open thread options for thread and tap on mark as read option
        await GlobalThreadsScreen.openThreadOptionsFor(parentPost.id);
        await ThreadOptionsScreen.markAsReadOption.tap();

        // * Verify thread is not displayed anymore in unread threads section
        await wait(timeouts.ONE_SEC);
        await expect(GlobalThreadsScreen.getThreadItem(parentPost.id)).not.toBeVisible();

        // # Tap on all your threads button, tap on the thread, and add new reply to thread
        await GlobalThreadsScreen.headerAllThreadsButton.tap();
        await GlobalThreadsScreen.getThreadItem(parentPost.id).tap();
        const newReplyMessage = `${parentMessage} new reply`;
        await ThreadScreen.postMessage(newReplyMessage);

        // * Verify new reply is posted
        const {post: newReplyPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = ThreadScreen.getPostListPostItem(newReplyPost.id, newReplyMessage);
        await expect(postListPostItem).toBeVisible();

        // # Go back to channel list screen
        await ThreadScreen.back();
        await GlobalThreadsScreen.back();
    });

    it('MM-T4811_2 - should be able to save/unsave a thread and open a thread in channel', async () => {
        // # Create a thread, go back to channel list screen, then go to global threads screen, open thread options for thread, tap on save option, and tap on thread
        const parentMessage = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(parentMessage);
        const {post: parentPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.openReplyThreadFor(parentPost.id, parentMessage);
        const replyMessage = `${parentMessage} reply`;
        await ThreadScreen.postMessage(replyMessage);
        await ThreadScreen.back();
        await ChannelScreen.back();
        await GlobalThreadsScreen.open();
        await GlobalThreadsScreen.openThreadOptionsFor(parentPost.id);
        await ThreadOptionsScreen.saveThreadOption.tap();
        await GlobalThreadsScreen.getThreadItem(parentPost.id).tap();

        // * Verify saved text is displayed on the post pre-header
        const {postListPostItemPreHeaderText} = ThreadScreen.getPostListPostItem(parentPost.id, parentMessage);
        await expect(postListPostItemPreHeaderText).toHaveText(savedText);

        // # Go back to global threads screen, open thread options for thread, tap on save option, and tap on thread
        await ThreadScreen.back();
        await GlobalThreadsScreen.openThreadOptionsFor(parentPost.id);
        await wait(timeouts.ONE_SEC);
        await ThreadOptionsScreen.unsaveThreadOption.tap();
        await wait(timeouts.ONE_SEC);
        await GlobalThreadsScreen.getThreadItem(parentPost.id).tap();

        // * Verify saved text is not displayed on the post pre-header
        await expect(postListPostItemPreHeaderText).not.toBeVisible();

        // # Go back to global threads screen, open thread options for thread, tap on open in channel option, and jump to recent messages
        await ThreadScreen.back();
        await GlobalThreadsScreen.openThreadOptionsFor(parentPost.id);
        await ThreadOptionsScreen.openInChannelOption.tap();
        await PermalinkScreen.jumpToRecentMessages();

        // * Verify on channel screen and thread is displayed
        await ChannelScreen.toBeVisible();
        const {postListPostItem} = ChannelScreen.getPostListPostItem(parentPost.id, parentMessage);
        await expect(postListPostItem).toBeVisible();

        // # Go back to channel list screen
        await ChannelScreen.back();
        await GlobalThreadsScreen.back();
    });
});
