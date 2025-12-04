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

describe('Messaging - Markdown Latex', () => {
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

    // TODO: Uncomment the test when the issue is fixed https://mattermost.atlassian.net/browse/MM-63817
    it.skip('MM-T4900_1 - should be able to display markdown latex code block', async () => {
        // # Open a channel screen and post a markdown latex code block
        // eslint-disable-next-line no-useless-escape
        const message = 'X_k = \sum_{n=0}^{2N-1} x_n \cos \left[\frac{\pi}{N} \left(n+\frac{1}{2}+\frac{N}{2}\right) \left(k+\frac{1}{2}\right) \right]';
        const markdownLatexCodeBlock = `\`\`\`latex\n${message}\n\`\`\``;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(markdownLatexCodeBlock);

        // * Verify markdown latex code block is displayed
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItemLatexCodeBlock} = ChannelScreen.getPostListPostItem(post.id);
        await waitFor(postListPostItemLatexCodeBlock).toBeVisible().whileElement(by.id(ChannelScreen.postList.testID.flatList)).scroll(50, 'down');
        await expect(postListPostItemLatexCodeBlock).toBeVisible();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T4900_2 - should be able to display markdown inline latex', async () => {
        // # Open a channel screen and post a markdown inline latex
        // eslint-disable-next-line no-useless-escape
        const message = 'X_k = \\sum_{n=0}^{2N-1} x_n \\cos \\left[\\frac{\\pi}{N} \\left(n+\\frac{1}{2}+\\frac{N}{2}\\right) \\left(k+\\frac{1}{2}\\right) \\right]';
        const markdownInlineLatex = `$${message}$`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(markdownInlineLatex);

        // * Verify markdown inline latex is displayed
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItemInlineLatex} = ChannelScreen.getPostListPostItem(post.id);
        await expect(postListPostItemInlineLatex).toBeVisible();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
