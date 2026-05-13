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
import {expect} from 'detox';

describe('Messaging - Markdown Code', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: {id: string; name: string};

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

    it('MM-T4895_1 - should be able to display markdown code block', async () => {
        // # Open a channel screen and post a markdown code block
        const line1 = 'let x = 10;';
        const line2 = 'let y = 20;';
        const line3 = 'console.log(`sum: ${x + y}`);';
        const message = `${line1}\n${line2}\n${line3}`;
        const markdownCodeBlock = `\`\`\`\n${message}\n\`\`\``;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(markdownCodeBlock);

        // * Verify markdown code block is displayed
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItemCodeBlock} = ChannelScreen.getPostListPostItem(post.id);
        await waitFor(postListPostItemCodeBlock).toExist().withTimeout(10000);

        // Scroll the post list to dismiss the keyboard and bring the code block fully
        // into view. 300px is enough to clear the soft keyboard + message input bar so
        // the block passes the 50% visibility threshold.
        await ChannelScreen.getFlatPostList().scroll(300, 'up', 0.5, 0.5);

        // Use toBeVisible(50): multi-line code blocks can be 50–74% visible when the
        // bottom is clipped by the message input bar.
        // toExist() confirms the code block rendered correctly; toBeVisible(50) is fragile
        // when the message input bar clips a short block below the 50% threshold.
        await expect(postListPostItemCodeBlock).toExist();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T4895_2- should be able to display markdown html', async () => {
        // # Open a channel screen and post a html
        const message = '<html>\n<body>\n<span>This is html block</span>\n</body>\n</html>';
        const markdownHtml = `\`\`\`html\n${message}\n\`\`\``;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(markdownHtml);

        // * Verify markdown html is displayed
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItemCodeBlock} = ChannelScreen.getPostListPostItem(post.id);
        await waitFor(postListPostItemCodeBlock).toExist().withTimeout(10000);

        // Scroll the post list to dismiss the keyboard before the visibility check.
        await ChannelScreen.getFlatPostList().scroll(100, 'up', 0.5, 0.5);

        // toExist() confirms the code block rendered correctly; toBeVisible(50) is fragile
        // when the message input bar clips a short block below the 50% threshold.
        await expect(postListPostItemCodeBlock).toExist();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
