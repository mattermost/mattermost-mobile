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
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {timeouts} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Messaging - Emoji Display', () => {

    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let testUser: any;

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
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

    it('MM-T4125_1 - should render emojis on multiple lines correctly', async () => {
        // # Open a channel screen and post a message with emojis on multiple lines
        // Using API to send multiline message precisely
        const multiLineEmojiMessage = '😀\n😁\n😂';
        await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: multiLineEmojiMessage,
        });
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);

        // # Open the channel to view the post
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // * Verify the multiline emoji post is visible in the channel
        // The post container should exist with the post ID
        const postItemMatcher = by.id(`channel.post_list.post.${post.id}`);
        const postItem = element(postItemMatcher);
        await waitFor(postItem).toExist().withTimeout(timeouts.TEN_SEC);
        await expect(postItem).toExist();

        // * Verify emoji elements are rendered within the post
        // Multi-line emoji-only posts render each line's emoji with testID 'markdown_emoji'.
        // Multiple elements match so use atIndex(0) to check the first one exists.
        const emojiElements = element(by.id('markdown_emoji').withAncestor(postItemMatcher)).atIndex(0);
        await expect(emojiElements).toExist();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
