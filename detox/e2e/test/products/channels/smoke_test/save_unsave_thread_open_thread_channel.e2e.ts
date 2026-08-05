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
    System,
    User,
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
import {getRandomId, timeouts, wait, waitForElementToBeVisible} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Smoke Test - Threads', () => {

    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;

    beforeAll(async () => {
        // # Admin login required before apiInit (which uses admin endpoints)
        await User.apiAdminLogin(siteOneUrl);

        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;

        // # Enable Collapsed Reply Threads so the follow button appears in thread navigation
        await System.apiUpdateConfig(siteOneUrl, {
            ServiceSettings: {
                CollapsedThreads: 'always_on',
                ThreadAutoFollow: true,
            },
        });

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

    it('MM-T4811_2 - should be able to save/unsave a thread and open a thread in channel', async () => {
        // # Create a thread, go back to channel list screen, then go to global threads screen, open thread options for thread, tap on save option, and tap on thread
        const parentMessage = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await waitFor(ChannelScreen.postInput).toBeVisible().withTimeout(timeouts.FOUR_SEC);
        await ChannelScreen.postMessage(parentMessage);
        const {post: parentPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: parentPostItem2} = ChannelScreen.getPostListPostItem(parentPost.id, parentMessage);
        await waitFor(parentPostItem2).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await ChannelScreen.openReplyThreadFor(parentPost.id, parentMessage);
        const replyMessage = `${parentMessage} reply`;
        await ThreadScreen.postMessage(replyMessage);
        await ThreadScreen.back();
        await ChannelScreen.back();
        await GlobalThreadsScreen.open();
        await GlobalThreadsScreen.openThreadOptionsFor(parentPost.id);
        await ThreadOptionsScreen.saveThreadOption.tap();

        await GlobalThreadsScreen.getThreadItem(parentPost.id).tap();

        // * Verify the thread is saved — assert on the thread_overview bookmark button, not the
        // post pre-header. atIndex(0) skips stale off-screen ThreadScreen mounts.
        const threadOverviewUnsaveButton = element(by.id('thread.post_list.thread_overview.unsave.button')).atIndex(0);
        const threadOverviewSaveButton = element(by.id('thread.post_list.thread_overview.save.button')).atIndex(0);
        await waitFor(threadOverviewUnsaveButton).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Go back to global threads screen, open thread options for thread, tap on unsave option
        await ThreadScreen.back();
        await GlobalThreadsScreen.openThreadOptionsFor(parentPost.id);
        await waitFor(ThreadOptionsScreen.unsaveThreadOption).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await ThreadOptionsScreen.unsaveThreadOption.tap();

        // * Verify the thread is unsaved — the thread_overview button flips back to *.save.button.
        await GlobalThreadsScreen.getThreadItem(parentPost.id).tap();
        await waitFor(threadOverviewSaveButton).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Go back to global threads screen, open thread options for thread, tap on open in channel option, and jump to recent messages
        await ThreadScreen.back();
        await GlobalThreadsScreen.openThreadOptionsFor(parentPost.id);
        await waitFor(ThreadOptionsScreen.openInChannelOption).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await ThreadOptionsScreen.openInChannelOption.tap();
        await waitFor(PermalinkScreen.permalinkScreen).toBeVisible().withTimeout(timeouts.TEN_SEC);
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
