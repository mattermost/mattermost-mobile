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
    PermalinkScreen,
    ServerScreen,
    ThreadOptionsScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Threads - Open Thread in Channel', () => {

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

    it('MM-T4810_1 - should be able to open a thread in channel via thread options', async () => {
        // # Create a thread, go back to channel list screen, and then go to global threads screen
        const parentMessage = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(parentMessage);
        await ChannelScreen.dismissScheduledPostTooltip();
        const {post: parentPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(parentPost.id, parentMessage);
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.FOUR_SEC);

        await ChannelScreen.openReplyThreadFor(parentPost.id, parentMessage);
        const replyMessage = `${parentMessage} reply`;
        await ThreadScreen.postMessage(replyMessage);
        await ThreadScreen.back();
        await ChannelScreen.back();
        await GlobalThreadsScreen.open();

        // * Verify thread is displayed
        await expect(GlobalThreadsScreen.getThreadItem(parentPost.id)).toBeVisible();

        // # Open thread options for thread and tap open in channel option
        await GlobalThreadsScreen.openThreadOptionsFor(parentPost.id);
        await ThreadOptionsScreen.openInChannelOption.tap();

        // * Verify on permalink screen
        await PermalinkScreen.toBeVisible();

        // # Jump to recent messages
        await PermalinkScreen.jumpToRecentMessages();

        // * Verify on channel screen and thread is displayed
        await ChannelScreen.toBeVisible();
        await ChannelScreen.dismissScheduledPostTooltip();
        const {postListPostItem: channelPostItem} = ChannelScreen.getPostListPostItem(parentPost.id, parentMessage);
        await expect(channelPostItem).toBeVisible();

        // # Go back to channel list screen
        await ChannelScreen.back();
        await GlobalThreadsScreen.back();
    });
});
