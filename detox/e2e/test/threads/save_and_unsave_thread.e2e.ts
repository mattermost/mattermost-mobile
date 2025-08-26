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
    ThreadOptionsScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {getRandomId} from '@support/utils';
import {expect} from 'detox';

describe('Threads - Save and Unsave Thread', () => {
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

    it('MM-T4808_1 - should be able to save/unsave a thread via thread options', async () => {
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

        // # Open thread options for thread, tap on save option, and tap on thread
        await GlobalThreadsScreen.openThreadOptionsFor(parentPost.id);
        await ThreadOptionsScreen.saveThreadOption.tap();
        await GlobalThreadsScreen.getThreadItem(parentPost.id).tap();

        // * Verify saved text is displayed on the post pre-header
        const {postListPostItemPreHeaderText} = ThreadScreen.getPostListPostItem(parentPost.id, parentMessage);
        await expect(postListPostItemPreHeaderText).toHaveText(savedText);

        // # Go back to global threads screen, open thread options for thread, tap on save option, and tap on thread
        await ThreadScreen.back();
        await GlobalThreadsScreen.openThreadOptionsFor(parentPost.id);
        await ThreadOptionsScreen.unsaveThreadOption.tap();
        await GlobalThreadsScreen.getThreadItem(parentPost.id).tap();

        // * Verify saved text is not displayed on the post pre-header
        await expect(postListPostItemPreHeaderText).not.toBeVisible();

        // # Go back to channel list screen
        await ThreadScreen.back();
        await ChannelScreen.back();
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

        // * Verify saved text is displayed on the post pre-header
        const {postListPostItemPreHeaderText} = ThreadScreen.getPostListPostItem(parentPost.id, parentMessage);
        await expect(postListPostItemPreHeaderText).toHaveText(savedText);

        // # Tap on thread overview unsave button
        await ThreadScreen.getThreadOverviewUnsaveButton().tap();

        // # Go back to channel list screen
        await ThreadScreen.back();
        await ChannelScreen.back();
    });
});
