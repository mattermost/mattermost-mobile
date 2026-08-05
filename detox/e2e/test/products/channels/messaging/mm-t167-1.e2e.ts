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

    it('MM-T167_1 - should render invalid emoji syntax as plain text', async () => {
        // # Post a message with an invalid emoji name (not a real emoji)
        const invalidEmojiMessage = ':notarealemoji:';
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(invalidEmojiMessage);
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);

        // * Verify the post is visible and the text renders as plain text (not as an emoji image)
        const postItemMatcher = by.id(`channel.post_list.post.${post.id}`);
        await waitFor(element(postItemMatcher)).toExist().withTimeout(timeouts.TEN_SEC);

        // * Verify the invalid emoji text appears as a plain text node
        const plainTextElement = element(by.text(invalidEmojiMessage).withAncestor(postItemMatcher));
        await expect(plainTextElement).toExist();

        // * Verify no 'markdown_emoji' element is rendered (it is plain text, not an emoji)
        const emojiElement = element(by.id('markdown_emoji').withAncestor(postItemMatcher));
        await expect(emojiElement).not.toExist();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
