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

/**
 * Both tests assert that a markdown image *renders*, so the URL has to serve an
 * image. When the fetch fails, MarkdownImage sets `failed` and returns a bare
 * broken-image CompassIcon that never reaches testID='markdown_image'
 * (app/components/markdown/markdown_image/index.tsx).
 *
 * docs.mattermost.com/_images/icon-76x76.png 404s (CI 33936010053 MM-T4896
 * testFnFailure.png: username row with empty body, no markdown_image). This
 * mattermost.com upload is the same asset file_preview_gallery.e2e.ts uses.
 */
const MARKDOWN_IMAGE_URL = 'https://mattermost.com/wp-content/uploads/2022/02/icon_WS.png';

describe('Messaging - Markdown Image', () => {
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

    it('MM-T4896_1 - should be able to display markdown image', async () => {
        // # Open a channel screen and post a markdown image
        const markdownImage = `![Mattermost](${MARKDOWN_IMAGE_URL})`;
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // * Verify markdown image is displayed
        const {post} = await ChannelScreen.postMessageAndVerify(markdownImage, testChannel.id, siteOneUrl);
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
        const markdownImage = `[![Mattermost](${MARKDOWN_IMAGE_URL})](https://github.com/mattermost/mattermost-server)`;
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // * Verify markdown image with link is displayed
        const {post} = await ChannelScreen.postMessageAndVerify(markdownImage, testChannel.id, siteOneUrl);
        const {postListPostItem, postListPostItemImage} = ChannelScreen.getPostListPostItem(post.id);

        // Scroll to the post first to ensure it's in view
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.FOUR_SEC);

        // Wait for image to load and have dimensions (not 0x0)
        await waitFor(postListPostItemImage).toExist().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
