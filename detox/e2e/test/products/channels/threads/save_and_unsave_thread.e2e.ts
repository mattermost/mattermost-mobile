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
import {getRandomId, timeouts} from '@support/utils';
import {expect} from 'detox';

describe('Threads - Save and Unsave Thread', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;

        // Enable CRT for global threads UI.
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

    it('MM-T4808_2 - should be able to save/unsave a thread via thread overview', async () => {
        // # Create a thread, go back to channel list screen, and then go to global threads screen
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

        // * Verify thread is displayed
        await expect(GlobalThreadsScreen.getThreadItem(parentPost.id)).toBeVisible();

        // # Tap on thread and tap on thread overview save button
        await GlobalThreadsScreen.getThreadItem(parentPost.id).tap();
        await ThreadScreen.getThreadOverviewSaveButton().tap();

        // * Verify the thread is saved.
        await waitFor(element(by.id('thread.post_list.thread_overview.unsave.button')).atIndex(0)).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Tap on thread overview unsave button
        await ThreadScreen.getThreadOverviewUnsaveButton().tap();

        // * Verify the thread is unsaved
        await waitFor(element(by.id('thread.post_list.thread_overview.save.button')).atIndex(0)).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await ThreadScreen.back();
        await ChannelScreen.back();
    });
});
