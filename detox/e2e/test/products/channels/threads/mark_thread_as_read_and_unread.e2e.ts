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
import {Alert} from '@support/ui/component';
import {
    ChannelListScreen,
    ChannelScreen,
    GlobalThreadsScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
    ThreadOptionsScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Threads - Mark Thread as Read and Unread', () => {
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

    it('MM-T4807_1 - should be able to mark a thread as read by opening thread', async () => {
        // # Create a thread started by the current user which another user replied to, go back to channel list screen, then go to global threads screen, and tap on unread threads button
        const parentMessage = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(parentMessage);
        const {post: parentPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: `${parentMessage} reply`,
            rootId: parentPost.id,
        });
        await ChannelScreen.back();
        await device.reloadReactNative();
        await GlobalThreadsScreen.open();
        await GlobalThreadsScreen.headerUnreadThreadsButton.tap();

        // * Verify thread is displayed as unread in unread threads section with unread dot badge and footer unread replies
        await expect(GlobalThreadsScreen.getThreadItem(parentPost.id)).toBeVisible();
        await expect(GlobalThreadsScreen.getThreadItemUnreadDotBadge(parentPost.id)).toBeVisible();
        await expect(GlobalThreadsScreen.getThreadItemFooterUnreadReplies(parentPost.id)).toHaveText('1 new reply');

        // # Tap on the thread and go back to global threads screen
        await GlobalThreadsScreen.getThreadItem(parentPost.id).tap();
        await ThreadScreen.back();

        // * Verify thread is not displayed anymore in unread threads section
        await expect(GlobalThreadsScreen.getThreadItem(parentPost.id)).not.toBeVisible();

        // # Tap on all your threads button
        await GlobalThreadsScreen.headerAllThreadsButton.tap();

        // * Verify thread is displayed as read in all your threads section without unread dot badge and with footer reply count
        await expect(GlobalThreadsScreen.getThreadItem(parentPost.id)).toBeVisible();
        await expect(GlobalThreadsScreen.getThreadItemUnreadDotBadge(parentPost.id)).not.toBeVisible();
        await expect(GlobalThreadsScreen.getThreadItemFooterReplyCount(parentPost.id)).toHaveText('1 reply');

        // # Go back to channel list screen
        await GlobalThreadsScreen.back();
    });

    it('MM-T4807_2 - should be able to mark a thread as read/unread via thread options', async () => {
        // # Create a thread started by the current user which another user replied to, go back to channel list screen, then go to global threads screen, and tap on unread threads button
        const parentMessage = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(parentMessage);
        const {post: parentPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: `${parentMessage} reply`,
            rootId: parentPost.id,
        });
        await ChannelScreen.back();
        await device.reloadReactNative();
        await GlobalThreadsScreen.open();
        await GlobalThreadsScreen.headerUnreadThreadsButton.tap();

        // * Verify thread is displayed as unread in unread threads section with unread dot badge and footer unread replies
        await expect(GlobalThreadsScreen.getThreadItem(parentPost.id)).toBeVisible();
        await expect(GlobalThreadsScreen.getThreadItemUnreadDotBadge(parentPost.id)).toBeVisible();
        await expect(GlobalThreadsScreen.getThreadItemFooterUnreadReplies(parentPost.id)).toHaveText('1 new reply');

        // # Open thread options for thread and tap on mark as read option
        await GlobalThreadsScreen.openThreadOptionsFor(parentPost.id);
        await ThreadOptionsScreen.markAsReadOption.tap();

        // * Verify thread is not displayed anymore in unread threads section
        await wait(timeouts.ONE_SEC);
        await expect(GlobalThreadsScreen.getThreadItem(parentPost.id)).not.toBeVisible();

        // # Tap on all your threads button
        await GlobalThreadsScreen.headerAllThreadsButton.tap();

        // * Verify thread is displayed as read in all your threads section without unread dot badge and with footer reply count
        await expect(GlobalThreadsScreen.getThreadItem(parentPost.id)).toBeVisible();
        await expect(GlobalThreadsScreen.getThreadItemUnreadDotBadge(parentPost.id)).not.toBeVisible();
        await expect(GlobalThreadsScreen.getThreadItemFooterReplyCount(parentPost.id)).toHaveText('1 reply');

        // # Open thread options for thread and tap on mark as unread option
        await GlobalThreadsScreen.openThreadOptionsFor(parentPost.id);
        await ThreadOptionsScreen.markAsUnreadOption.tap();

        // * Verify thread is displayed as unread in all your threads section with unread dot badge and footer unread replies
        await wait(timeouts.ONE_SEC);
        await expect(GlobalThreadsScreen.getThreadItem(parentPost.id)).toBeVisible();
        await expect(GlobalThreadsScreen.getThreadItemUnreadDotBadge(parentPost.id)).toBeVisible();
        await expect(GlobalThreadsScreen.getThreadItemFooterUnreadReplies(parentPost.id)).toHaveText('1 new reply');

        // # Go back to channel list screen
        await GlobalThreadsScreen.back();
    });

    it('MM-T4807_3 - should be able to mark all threads as read', async () => {
        // # Create a thread started by the current user which another user replied to, go back to channel list screen, then go to global threads screen, and tap on unread threads button
        const parentMessage = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(parentMessage);
        const {post: parentPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: `${parentMessage} reply`,
            rootId: parentPost.id,
        });
        await ChannelScreen.back();
        await device.reloadReactNative();
        await GlobalThreadsScreen.open();
        await GlobalThreadsScreen.headerUnreadThreadsButton.tap();

        // * Verify thread is displayed as unread in unread threads section with unread dot badge and footer unread replies
        await expect(GlobalThreadsScreen.getThreadItem(parentPost.id)).toBeVisible();
        await expect(GlobalThreadsScreen.getThreadItemUnreadDotBadge(parentPost.id)).toBeVisible();
        await expect(GlobalThreadsScreen.getThreadItemFooterUnreadReplies(parentPost.id)).toHaveText('1 new reply');

        // # Tap on mark all as read button
        await GlobalThreadsScreen.headerMarkAllAsReadButton.tap();

        // * Verify mark all as read alert is displayed
        await expect(Alert.markAllAsReadTitle).toBeVisible();

        // # Tap on mark read button
        await Alert.markReadButton.tap();

        // * Verify thread is not displayed anymore and unread threads section is empty
        await expect(GlobalThreadsScreen.getThreadItem(parentPost.id)).not.toBeVisible();
        await expect(GlobalThreadsScreen.emptyThreadsList).toBeVisible();

        // # Go back to channel list screen
        await GlobalThreadsScreen.back();
    });
});
