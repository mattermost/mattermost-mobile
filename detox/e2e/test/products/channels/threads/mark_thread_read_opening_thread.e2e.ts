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

        // # Enable Collapsed Reply Threads so the global threads UI surfaces
        // are rendered (ThreadsButton in the channel-list sidebar, follow
        // button in thread navigation, etc.). Without `always_on` the
        // `channel_list.threads.button` testID is conditionally removed
        // (see app/screens/home/channel_list/categories_list/categories_list.tsx
        // — `threadButtonComponent` returns null when `!isCRTEnabled`).
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
});
