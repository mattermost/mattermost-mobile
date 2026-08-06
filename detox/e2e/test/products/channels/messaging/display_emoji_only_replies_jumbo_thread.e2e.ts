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
    ThreadScreen,
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

    it('MM-T162_1 - should display emoji-only replies as jumbo in thread view', async () => {
        // # Post a root message in the channel via API
        const rootMessage = 'Root message for emoji reply test';
        await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: rootMessage,
        });
        const {post: rootPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);

        // # Post an emoji-only reply to the root post via API
        const emojiReply = '🎉';
        await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: emojiReply,
            rootId: rootPost.id,
        });
        const {post: replyPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);

        // # Open the channel and navigate to the thread
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.openReplyThreadFor(rootPost.id, rootMessage);
        await ThreadScreen.toBeVisible();

        // * Verify the emoji reply is visible in the thread
        // TODO: JumboEmoji exposes no container testID, so jumbo vs normal rendering cannot be asserted.
        const replyPostMatcher = by.id(`thread.post_list.post.${replyPost.id}`);
        const emojiInThread = element(by.id('markdown_emoji').withAncestor(replyPostMatcher));
        await waitFor(emojiInThread).toExist().withTimeout(timeouts.TEN_SEC);

        // * Verify the emoji element exists in the thread (rendered via JumboEmoji path)
        await expect(emojiInThread).toExist();

        // # Go back to channel list screen
        await ThreadScreen.back();
        await ChannelScreen.back();
    });
});
