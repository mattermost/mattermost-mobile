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

describe('Messaging - Markdown Image', () => {
    const serverOneDisplayName = 'Server 1';
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

    it('MM-T4896_1 - should be able to display markdown image', async () => {
        // # Open a channel screen and post a markdown image
        const markdownImage = '![Mattermost](https://docs.mattermost.com/_images/icon-76x76.png)';
        await ChannelScreen.open(testChannel);
        await ChannelScreen.postMessage(markdownImage);

        // * Verify markdown image is displayed
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem, postListPostItemImage} = ChannelScreen.getPostListPostItem(post.id);

        // Scroll to the post first to ensure it's in view
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.FOUR_SEC);

        // Wait for image to load and have dimensions (not 0x0)
        await waitFor(postListPostItemImage).toExist().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T4896_2 - should be able to display markdown image with link', async () => {
        // # Open a channel screen and post a markdown image with link
        const markdownImage = '[![Mattermost](https://docs.mattermost.com/_images/icon-76x76.png)](https://github.com/mattermost/mattermost-server)';
        await ChannelScreen.open(testChannel);
        await ChannelScreen.postMessage(markdownImage);

        // * Verify markdown image with link is displayed
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem, postListPostItemImage} = ChannelScreen.getPostListPostItem(post.id);

        // Scroll to the post first to ensure it's in view
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.FOUR_SEC);

        // Wait for image to load and have dimensions (not 0x0)
        await waitFor(postListPostItemImage).toExist().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
