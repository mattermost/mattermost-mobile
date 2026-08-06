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
import {
    ChannelListScreen,
    ChannelScreen,
    GlobalThreadsScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait} from '@support/utils';
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
        await LoginScreen.login(testUser);
    });

    beforeEach(async () => {
        // # Reset to the channel list even if the previous thread back navigation returned to its channel.
        await ChannelListScreen.open();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
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
        await wait(timeouts.TWO_SEC);
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
});
