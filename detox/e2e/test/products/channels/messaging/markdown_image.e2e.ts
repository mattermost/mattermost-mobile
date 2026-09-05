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
 * Both tests below assert that a markdown image *renders*, so the URL has to actually serve an
 * image. When the fetch fails, MarkdownImage sets `failed` and returns a bare broken-image
 * CompassIcon from an early return that never reaches the `testID='markdown_image'` wrapper
 * (app/components/markdown/markdown_image/index.tsx) -- so a dead URL surfaces as
 * "10.0sec timeout expired without matching of given matcher", not as an image error.
 *
 * The previous URL, docs.mattermost.com/_images/icon-76x76.png, started returning 404 and took
 * MM-T4896_1 and _2 down with it on b89ed6b. Sphinx rewrites `_images/` paths whenever the docs
 * rebuild, so that host is not a safe place to pin an asset. This one is a stable
 * mattermost.com upload already exercised by file_preview_gallery.e2e.ts, and at 701x701 it
 * stays under the 4096 ANDROID_MAX_WIDTH/HEIGHT cap, which is a second early return that would
 * likewise drop the testID.
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
