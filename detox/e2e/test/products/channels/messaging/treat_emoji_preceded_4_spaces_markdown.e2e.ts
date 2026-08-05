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
    Team,
    User,
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
    PostOptionsScreen,
    ServerScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Messaging - Emoji Display', () => {

    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
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

    it('MM-T198_1 - should treat emoji preceded by 4+ spaces as markdown code block (not jumbo)', async () => {
        // # Post a message where an emoji is preceded by 4 spaces via API
        // The post.tsx component checks (/^\s{4}/).test(post.message) before calling
        // hasJumboEmojiOnly — 4+ leading spaces cause it to render as a code block instead.
        const fourSpaceEmojiMessage = '    😀';
        await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: fourSpaceEmojiMessage,
        });
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);

        // # Open the channel to view the post
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // * Verify the post container is visible
        const postItemMatcher = by.id(`channel.post_list.post.${post.id}`);
        const postItem = element(postItemMatcher);
        await waitFor(postItem).toExist().withTimeout(timeouts.TEN_SEC);
        await expect(postItem).toExist();

        // * Verify the message is rendered as a code block (markdown_code_block), not jumbo emoji
        // When 4+ leading spaces are present, isJumboEmoji is false and the Message component
        // renders normally, treating the content as a markdown indented code block.
        const codeBlock = element(by.id('markdown_code_block').withAncestor(postItemMatcher));
        await expect(codeBlock).toExist();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
