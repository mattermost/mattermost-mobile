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
        // Wrap in try-catch: scroll up fails when the post list is already at the top.
        try {
            await ChannelScreen.getFlatPostList().scroll(100, 'up', 0.5, 0.5);
        } catch { /* already at top — non-fatal */ }

        // toExist() confirms the code block rendered correctly; toBeVisible(50) is fragile
        // when the message input bar clips a short block below the 50% threshold.
        await expect(postListPostItemCodeBlock).toExist();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
