// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import path from 'path';

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

/**
 * Both tests assert that a markdown image *renders*, so the URL has to actually serve an
 * image. When the fetch fails, MarkdownImage sets `failed` and returns a bare broken-image
 * CompassIcon from an early return that never reaches the `testID='markdown_image'` wrapper
 * (app/components/markdown/markdown_image/index.tsx) -- so a dead URL surfaces as
 * "10.0sec timeout expired without matching of given matcher", not as an image error.
 *
 * Main iOS Detox 33798378709 / 33893207086 / 34262408124: MM-T4896_1 and _2 both failed
 * that way against https://mattermost.com/wp-content/uploads/2022/02/icon_WS.png (and
 * docs.mattermost.com/_images/icon-76x76.png 404s whenever Sphinx rebuilds). A same-server
 * `/api/v4/files/{id}` URL is fetched with the app's auth headers (ExpoImage attaches them
 * for same-origin `/api/v4/` paths). image.png is 1250x833, under the 4096 Android cap
 * that would likewise drop the testID.
 */
const MARKDOWN_IMAGE_FIXTURE = path.resolve(__dirname, '../../../../support/fixtures/image.png');

describe('Messaging - Markdown Image', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let markdownImageUrl = '';

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;

        const {fileId, error} = await Post.apiUploadFileToChannel(siteOneUrl, testChannel.id, MARKDOWN_IMAGE_FIXTURE);
        if (!fileId) {
            throw new Error(`markdown image fixture upload failed: ${JSON.stringify(error)}`);
        }
        markdownImageUrl = `/api/v4/files/${fileId}`;

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
        const markdownImage = `![Mattermost](${markdownImageUrl})`;
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
        const markdownImage = `[![Mattermost](${markdownImageUrl})](https://github.com/mattermost/mattermost-server)`;
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
