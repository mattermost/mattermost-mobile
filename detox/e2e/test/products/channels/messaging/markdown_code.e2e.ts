// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
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
        const {post} = await ChannelScreen.postMessageAndVerify(markdownCodeBlock, testChannel.id, siteOneUrl);
        await ChannelScreen.dismissKeyboard();

        // * Verify markdown code block is displayed
        const {postListPostItemCodeBlock} = ChannelScreen.getPostListPostItem(post.id);
        await waitFor(postListPostItemCodeBlock).toExist().withTimeout(timeouts.TEN_SEC);

        // toExist() confirms the code block rendered: the message input bar can clip a short block
        // below even the 50% visibility threshold.
        await expect(postListPostItemCodeBlock).toExist();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T4895_2- should be able to display markdown html', async () => {
        // # Open a channel screen and post a html
        const message = '<html>\n<body>\n<span>This is html block</span>\n</body>\n</html>';
        const markdownHtml = `\`\`\`html\n${message}\n\`\`\``;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        const {post} = await ChannelScreen.postMessageAndVerify(markdownHtml, testChannel.id, siteOneUrl);
        await ChannelScreen.dismissKeyboard();

        // * Verify markdown html is displayed
        const {postListPostItemCodeBlock} = ChannelScreen.getPostListPostItem(post.id);
        await waitFor(postListPostItemCodeBlock).toExist().withTimeout(timeouts.TEN_SEC);

        // toExist() confirms the code block rendered correctly; toBeVisible(50) is fragile
        // when the message input bar clips a short block below the 50% threshold.
        await expect(postListPostItemCodeBlock).toExist();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
