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

    it('MM-T4895_1 - should be able to display markdown code block', async () => {
        // # Open a channel screen and post a markdown code block
        const line1 = 'let x = 10;';
        const line2 = 'let y = 20;';
        // eslint-disable-next-line no-template-curly-in-string
        const line3 = 'console.log(`sum: ${x + y}`);';
        const message = `${line1}\n${line2}\n${line3}`;
        const markdownCodeBlock = `\`\`\`\n${message}\n\`\`\``;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(markdownCodeBlock);

        // * Verify markdown code block is displayed
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItemCodeBlock} = ChannelScreen.getPostListPostItem(post.id);
        await waitFor(postListPostItemCodeBlock).toBeVisible().whileElement(by.id(ChannelScreen.postList.testID.flatList)).scroll(50, 'down');
        await expect(postListPostItemCodeBlock).toBeVisible();

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
        await waitFor(postListPostItemCodeBlock).toBeVisible().whileElement(by.id(ChannelScreen.postList.testID.flatList)).scroll(50, 'down');
        await expect(postListPostItemCodeBlock).toBeVisible();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
