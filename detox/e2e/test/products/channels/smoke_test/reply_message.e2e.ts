// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    Channel,
    Post,
    Setup,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelScreen,
    ChannelListScreen,
    EditPostScreen,
    EmojiPickerScreen,
    HomeScreen,
    LoginScreen,
    PostOptionsScreen,
    ServerScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {getRandomId, isAndroid, timeouts, wait, waitForElementToExist} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Smoke Test - Messaging', () => {

    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    const savedText = 'Saved';
    const pinnedText = 'Pinned';
    let testChannel: any;
    let testTeam: any;
    let testUser: any;

    beforeAll(async () => {
        const {channel, team, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testTeam = team;
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

    // Skip both: CI run 30000635898 — iOS post-option actions are unhittable and Android cascades at channel setup.

    it('MM-T4786_2 - should be able to reply to a message', async () => {
        // # Open a channel screen, post a message, and tap on the post
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, message);
        await postListPostItem.tap();

        // * Verify on reply thread screen
        await ThreadScreen.toBeVisible();

        // * Verify no thread overview while there are no replies
        await expect(ThreadScreen.getThreadOverview()).not.toBeVisible();

        // # Reply to parent post
        const replyMessage = `${message} reply`;
        await ThreadScreen.postMessage(replyMessage);

        // * Verify reply message is posted
        const {post: replyPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: replyPostListPostItem} = ThreadScreen.getPostListPostItem(replyPost.id, replyMessage);
        await expect(replyPostListPostItem).toBeVisible();

        // * Verify thread overview when there are replies
        await expect(ThreadScreen.getThreadOverview()).toBeVisible();

        // # Go back to channel list screen
        await ThreadScreen.back();
        await ChannelScreen.back();
    });
});
