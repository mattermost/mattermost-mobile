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
import {getRandomId, isAndroid, timeouts, wait, waitForElementToBeVisible} from '@support/utils';
import {expect, waitFor} from 'detox';

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
        const {postListPostItem} = ChannelScreen.getPostListPostItem(parentPost.id, parentMessage);
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.FOUR_SEC);

        await ChannelScreen.openReplyThreadFor(parentPost.id, parentMessage);
        await ThreadScreen.postMessage(`${parentMessage} reply`);

        // * Verify thread is followed by user by default via thread navigation
        // Use polling to wait for the button to appear, avoiding bridge-idle sync stalls
        // on Android and iOS after post animations and DB writes.
        await waitForElementToBeVisible(ThreadScreen.followingButton, timeouts.TEN_SEC);

        // # Unfollow thread via thread navigation
        await ThreadScreen.followingButton.tap();
        await wait(timeouts.TWO_SEC);

        // * Verify thread is not followed by user via thread navigation
        await waitForElementToBeVisible(ThreadScreen.followButton, timeouts.TEN_SEC);

        // # Follow thread via thread navigation
        await ThreadScreen.followButton.tap();
        await wait(timeouts.TWO_SEC);

        // * Verify thread is followed by user via thread navigation
        await waitForElementToBeVisible(ThreadScreen.followingButton, timeouts.TEN_SEC);

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
        // Use polling to wait for the post to be visible with its footer buttons
        const {postListPostItemFooterFollowButton, postListPostItemFooterFollowingButton} = ChannelScreen.getPostListPostItem(parentPost.id, parentMessage);
        if (isAndroid()) {
            await wait(timeouts.TWO_SEC);
        }
        await waitForElementToBeVisible(postListPostItemFooterFollowingButton, timeouts.TEN_SEC);

        // # Unfollow thread via post footer
        await postListPostItemFooterFollowingButton.tap();
        await wait(timeouts.TWO_SEC);

        // * Verify thread is not followed by user via post footer
        await waitForElementToBeVisible(postListPostItemFooterFollowButton, timeouts.TEN_SEC);

        // # Follow thread via post footer
        await postListPostItemFooterFollowButton.tap();
        await wait(timeouts.TWO_SEC);

        // * Verify thread is followed by user via post footer
        await waitForElementToBeVisible(postListPostItemFooterFollowingButton, timeouts.TEN_SEC);

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
        await waitFor(PostOptionsScreen.followingThreadOption).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Unfollow thread via post options
        await PostOptionsScreen.followingThreadOption.tap();
        await wait(timeouts.TWO_SEC);

        // * Verify post options are dismissed (wait for dimming overlay to clear on iOS 26)
        await waitFor(PostOptionsScreen.postOptionsScreen).not.toBeVisible().withTimeout(timeouts.FOUR_SEC);

        // * Verify thread is not followed by user via post footer
        const {postListPostItemFooterFollowButton, postListPostItemFooterFollowingButton} = ChannelScreen.getPostListPostItem(parentPost.id, parentMessage);
        await waitForElementToBeVisible(postListPostItemFooterFollowButton, timeouts.TEN_SEC);

        // # Open post options for thread
        await ChannelScreen.openPostOptionsFor(parentPost.id, parentMessage);

        // * Verify thread is not followed by user via post options
        await waitFor(PostOptionsScreen.followThreadOption).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Tap on follow thread option
        await PostOptionsScreen.followThreadOption.tap();
        await wait(timeouts.TWO_SEC);

        // * Verify post options are dismissed (wait for dimming overlay to clear on iOS 26)
        await waitFor(PostOptionsScreen.postOptionsScreen).not.toBeVisible().withTimeout(timeouts.FOUR_SEC);

        // * Verify thread is followed by user via post footer
        await waitForElementToBeVisible(postListPostItemFooterFollowingButton, timeouts.TEN_SEC);

        // # Open post options for thread
        await ChannelScreen.openPostOptionsFor(parentPost.id, parentMessage);

        // * Verify thread is followed by user via post options
        await waitFor(PostOptionsScreen.followingThreadOption).toBeVisible().withTimeout(timeouts.TEN_SEC);

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
        await waitFor(GlobalThreadsScreen.getThreadItem(parentPost.id)).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Open thread options for thread
        await GlobalThreadsScreen.openThreadOptionsFor(parentPost.id);

        // * Verify thread is followed by user via thread options
        await waitForElementToBeVisible(ThreadOptionsScreen.followingThreadOption, timeouts.TEN_SEC);

        // # Tap on unfollow thread option
        await ThreadOptionsScreen.followingThreadOption.tap();
        await wait(timeouts.TWO_SEC);

        // * Verify thread is not displayed anymore in all your threads section
        // After unfollow, the thread should disappear from "All your threads"
        await expect(GlobalThreadsScreen.getThreadItem(parentPost.id)).not.toBeVisible();
    });
});
