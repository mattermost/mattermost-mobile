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
    PostOptionsScreen,
    ServerScreen,
    ThreadOptionsScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Threads - Follow and Unfollow Thread', () => {
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

    it('MM-T4806_1 - should be able to follow/unfollow a thread via thread navigation', async () => {
        // # Create a thread
        const parentMessage = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(parentMessage);
        const {post: parentPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.openReplyThreadFor(parentPost.id, parentMessage);
        await ThreadScreen.postMessage(`${parentMessage} reply`);

        // * Verify thread is followed by user by default via thread navigation
        await expect(ThreadScreen.followingButton).toBeVisible();

        // # Unfollow thread via thread navigation
        await ThreadScreen.followingButton.tap();

        // * Verify thread is not followed by user via thread navigation
        await expect(ThreadScreen.followButton).toBeVisible();

        // # Follow thread via thread navigation
        await ThreadScreen.followButton.tap();

        // * Verify thread is followed by user via thread navigation
        await expect(ThreadScreen.followingButton).toBeVisible();

        // # Go back to channel list screen
        await ThreadScreen.back();
        await ChannelScreen.back();
    });

    it('MM-T4806_2 - should be able to follow/unfollow a thread via post footer', async () => {
        // # Create a thread and go back to channel screen
        const parentMessage = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(parentMessage);
        const {post: parentPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.openReplyThreadFor(parentPost.id, parentMessage);
        await ThreadScreen.postMessage(`${parentMessage} reply`);
        await ThreadScreen.back();

        // * Verify thread is followed by user by default via post footer
        const {postListPostItemFooterFollowButton, postListPostItemFooterFollowingButton} = ChannelScreen.getPostListPostItem(parentPost.id, parentMessage);
        await expect(postListPostItemFooterFollowingButton).toBeVisible();

        // # Unfollow thread via post footer
        await postListPostItemFooterFollowingButton.tap();

        // * Verify thread is not followed by user via post footer
        await expect(postListPostItemFooterFollowButton).toBeVisible();

        // # Follow thread via post footer
        await postListPostItemFooterFollowButton.tap();

        // * Verify thread is followed by user via post footer
        await expect(postListPostItemFooterFollowingButton).toBeVisible();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T4806_3 - should be able to follow/unfollow a thread via post options', async () => {
        // # Create a thread, go back to channel screen, and open post options for thread
        const parentMessage = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(parentMessage);
        const {post: parentPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.openReplyThreadFor(parentPost.id, parentMessage);
        await ThreadScreen.postMessage(`${parentMessage} reply`);
        await ThreadScreen.back();
        await ChannelScreen.openPostOptionsFor(parentPost.id, parentMessage);

        // * Verify thread is followed by user by default via post options
        await expect(PostOptionsScreen.followingThreadOption).toBeVisible();

        // # Unfollow thread via post options
        await PostOptionsScreen.followingThreadOption.tap();

        // * Verify thread is not followed by user via post footer
        const {postListPostItemFooterFollowButton, postListPostItemFooterFollowingButton} = ChannelScreen.getPostListPostItem(parentPost.id, parentMessage);
        await waitFor(postListPostItemFooterFollowButton).toBeVisible().withTimeout(timeouts.TWO_SEC);

        // # Open post options for thread
        await ChannelScreen.openPostOptionsFor(parentPost.id, parentMessage);

        // * Verify thread is not followed by user via post options
        await expect(PostOptionsScreen.followThreadOption).toBeVisible();

        // # Tap on follow thread option
        await PostOptionsScreen.followThreadOption.tap();

        // * Verify thread is followed by user via post footer
        await waitFor(postListPostItemFooterFollowingButton).toBeVisible().withTimeout(timeouts.TWO_SEC);

        // # Open post options for thread
        await ChannelScreen.openPostOptionsFor(parentPost.id, parentMessage);

        // * Verify thread is followed by user via post options
        await waitFor(PostOptionsScreen.followingThreadOption).toBeVisible().withTimeout(timeouts.TWO_SEC);

        // # Go back to channel list screen
        await PostOptionsScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T4806_4 - should be able to unfollow a thread via thread options', async () => {
        // # Create a thread, go back to channel list screen, then go to global threads screen, and tap on all your threads button
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
        await GlobalThreadsScreen.headerAllThreadsButton.tap();

        // * Verify thread is displayed
        await expect(GlobalThreadsScreen.getThreadItem(parentPost.id)).toBeVisible();

        // # Open thread options for thread
        await GlobalThreadsScreen.openThreadOptionsFor(parentPost.id);

        // * Verify thread is followed by user via thread options
        await waitFor(ThreadOptionsScreen.followingThreadOption).toBeVisible().withTimeout(timeouts.TWO_SEC);

        // # Tap on unfollow thread option
        await ThreadOptionsScreen.followingThreadOption.tap();

        // * Verify thread is not displayed anymore in all your threads section
        await wait(timeouts.ONE_SEC);
        await expect(GlobalThreadsScreen.getThreadItem(parentPost.id)).not.toBeVisible();

        await wait(timeouts.FOUR_SEC);

        // # Go back to channel list screen
        await GlobalThreadsScreen.back();
    });
});
