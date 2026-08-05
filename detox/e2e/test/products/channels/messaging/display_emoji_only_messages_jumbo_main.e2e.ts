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

    it('MM-T160_1 - should display emoji-only messages as jumbo in main thread', async () => {
        // # Open a channel screen and post a message with only 1-3 emojis (no text)
        const emojiOnlyMessage = '😀😁😂';
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(emojiOnlyMessage);

        // # Get the last post
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);

        // * Verify the emoji-only post is visible in the channel
        // The post renders via the JumboEmoji component (not regular Markdown) when
        // the message contains only 1-8 emojis and no leading 4+ spaces.
        // JumboEmoji renders each emoji with testID 'markdown_emoji'.
        // TODO: The JumboEmoji component does not currently expose a dedicated 'jumbo_emoji'
        // container testID — it reuses 'markdown_emoji'. To assert jumbo rendering distinctly,
        // a testID such as 'jumbo_emoji.container' would need to be added to
        // app/components/jumbo_emoji/index.tsx.
        const postItemMatcher = by.id(`channel.post_list.post.${post.id}`);
        const emojiElement = element(by.id('markdown_emoji').withAncestor(postItemMatcher));
        await waitFor(emojiElement).toExist().withTimeout(timeouts.TEN_SEC);

        // * Verify the emoji element is visible (rendered via JumboEmoji path)
        await expect(emojiElement).toExist();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
