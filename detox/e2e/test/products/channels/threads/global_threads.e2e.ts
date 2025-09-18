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
    GlobalThreadsScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts} from '@support/utils';
import {expect} from 'detox';

describe('Threads - Global Threads', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let testUser: any;

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testUser = user;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    beforeEach(async () => {
        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T4805_1 - should match elements on global threads screen', async () => {
        // # Open global threads screen
        await GlobalThreadsScreen.open();

        // * Verify basic elements on global threads screen
        await expect(GlobalThreadsScreen.headerAllThreadsButton).toBeVisible();
        await expect(GlobalThreadsScreen.headerUnreadThreadsButton).toBeVisible();
        await expect(GlobalThreadsScreen.headerMarkAllAsReadButton).toBeVisible();
        await expect(GlobalThreadsScreen.emptyThreadsList).toBeVisible();

        // # Go back to channel list screen
        await GlobalThreadsScreen.back();
    });

    it('MM-T4805_2 - should be able to go to a thread a user started and followed', async () => {
        // # Create a thread started by the current user which current user replied to
        const parentMessage = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(parentMessage);
        const {post: parentPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.openReplyThreadFor(parentPost.id, parentMessage);
        const replyMessage = `${parentMessage} reply`;
        await ThreadScreen.postMessage(replyMessage);
        const {post: replyPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: replyPostListPostItem} = ThreadScreen.getPostListPostItem(replyPost.id, replyMessage);

        // * Verify thread is followed by the current user by default
        await expect(ThreadScreen.followingButton).toBeVisible();

        // # Go back to channel list screen, then go to global threads screen, and tap on all your threads button
        await ThreadScreen.back();
        await ChannelScreen.back();
        await GlobalThreadsScreen.open();
        await GlobalThreadsScreen.headerAllThreadsButton.tap();

        // * Verify the thread started by the current user is displayed
        await expect(GlobalThreadsScreen.getThreadItem(parentPost.id)).toBeVisible();
        await expect(GlobalThreadsScreen.getThreadItemThreadStarterUserDisplayName(parentPost.id)).toHaveText(testUser.username);
        await expect(GlobalThreadsScreen.getThreadItemThreadStarterChannelDisplayName(parentPost.id)).toHaveText(testChannel.display_name.toUpperCase());
        try {
            // The reply count is shown as read.
            await waitFor(GlobalThreadsScreen.getThreadItemFooterReplyCount(parentPost.id)).toBeVisible().withTimeout(timeouts.TEN_SEC);
        } catch (error) {
            // somtimes the app shows it as unread since the test actions are fast.
            await waitFor(GlobalThreadsScreen.getThreadItemFooterUnreadReplies(parentPost.id)).toBeVisible().withTimeout(timeouts.TEN_SEC);
        }

        // # Tap on the thread
        await GlobalThreadsScreen.getThreadItem(parentPost.id).tap();

        // * Verify on thread screen
        await ThreadScreen.toBeVisible();
        await expect(replyPostListPostItem).toBeVisible();

        // # Go back to channel list screen
        await ThreadScreen.back();
        await GlobalThreadsScreen.back();
    });

    it('MM-T4805_3 - should not display a thread a user started but not followed', async () => {
        // # Create a thread started by the current user and current user unfollows the thread
        const parentMessage = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(parentMessage);
        const {post: parentPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.openReplyThreadFor(parentPost.id, parentMessage);
        await ThreadScreen.postMessage(`${parentMessage} reply`);
        await ThreadScreen.followingButton.tap();

        // * Verify thread is not followed by the current user
        await expect(ThreadScreen.followButton).toBeVisible();

        // # Go back to channel list screen, then go to global threads screen, and tap on all your threads button
        await ThreadScreen.back();
        await ChannelScreen.back();
        await GlobalThreadsScreen.open();
        await GlobalThreadsScreen.headerAllThreadsButton.tap();

        // * Verify the thread started by the current user is not displayed
        await expect(GlobalThreadsScreen.getThreadItem(parentPost.id)).not.toBeVisible();

        // # Go back to channel list screen
        await GlobalThreadsScreen.back();
    });

    it('MM-T4805_4 - should be able to go to a thread a user replied to and followed', async () => {
        // # Create a thread started by another user which the current user replied to
        const parentMessage = `Message ${getRandomId()}`;
        const {post: parentPost} = await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: parentMessage,
        });
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.openReplyThreadFor(parentPost.id, parentMessage);
        const replyMessage = `${parentMessage} reply`;
        await ThreadScreen.postMessage(replyMessage);
        const {post: replyPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: replyPostListPostItem} = ThreadScreen.getPostListPostItem(replyPost.id, replyMessage);

        // * Verify thread is followed by the current user by default after replying to post
        await expect(ThreadScreen.followingButton).toBeVisible();

        // # Go back to channel list screen, then go to global threads screen, and tap on all your threads button
        await ThreadScreen.back();
        await ChannelScreen.back();
        await GlobalThreadsScreen.open();
        await GlobalThreadsScreen.headerAllThreadsButton.tap();

        // * Verify the thread replied to by the current user is displayed
        await expect(GlobalThreadsScreen.getThreadItem(parentPost.id)).toBeVisible();
        await expect(GlobalThreadsScreen.getThreadItemThreadStarterUserDisplayName(parentPost.id)).toHaveText('admin');
        await expect(GlobalThreadsScreen.getThreadItemThreadStarterChannelDisplayName(parentPost.id)).toHaveText(testChannel.display_name.toUpperCase());

        // # Tap on the thread
        await GlobalThreadsScreen.getThreadItem(parentPost.id).tap();

        // * Verify on thread screen
        await ThreadScreen.toBeVisible();
        await expect(replyPostListPostItem).toBeVisible();

        // # Go back to channel list screen
        await ThreadScreen.back();
        await GlobalThreadsScreen.back();
    });

    it('MM-T4805_5 - should not display a thread a user replied to but not followed', async () => {
        // # Create a thread started by another user which the current user replied to and current user unfollows the thread
        const parentMessage = `Message ${getRandomId()}`;
        const {post: parentPost} = await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: parentMessage,
        });
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.openReplyThreadFor(parentPost.id, parentMessage);
        await ThreadScreen.postMessage(`${parentMessage} reply`);
        await ThreadScreen.followingButton.tap();

        // * Verify thread is not followed by the current user
        await expect(ThreadScreen.followButton).toBeVisible();

        // # Go back to channel list screen, then go to global threads screen, and tap on all your threads button
        await ThreadScreen.back();
        await ChannelScreen.back();
        await GlobalThreadsScreen.open();
        await GlobalThreadsScreen.headerAllThreadsButton.tap();

        // * Verify the thread replied to by the current user is not displayed
        await expect(GlobalThreadsScreen.getThreadItem(parentPost.id)).not.toBeVisible();

        // # Go back to channel list screen
        await GlobalThreadsScreen.back();
    });
});
