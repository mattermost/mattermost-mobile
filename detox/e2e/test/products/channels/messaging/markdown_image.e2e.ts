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
    System,
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
 * Why these two tests kept timing out on `markdown_image`, and why the URL matters.
 *
 * Markdown.renderImage (app/components/markdown/markdown.tsx) starts with
 * `if (!imagesMetadata || isUnsafeLinksPost) { return null; }`, and Message passes
 * `post.metadata?.images ?? undefined` (app/components/post_list/post/body/message/message.tsx).
 * So when the server did not preload the image, MarkdownImage is never mounted at all and
 * `testID='markdown_image'` cannot exist -- the failure surfaces as
 * "Timed out while waiting for expectation: TOEXIST ... markdown_image", with no image error
 * and no broken-image icon. Every past fix that treated this as "the image failed to load"
 * was chasing the wrong layer.
 *
 * The server only adds an entry to `post.metadata.images` for a URL it can fetch **anonymously**
 * while building post metadata. Measured against a real server:
 *
 *   ![x](/api/v4/files/{id})                  -> images: null   (needs a session)
 *   ![x](http://<site>/api/v4/files/{id})     -> images: null   (needs a session)
 *   ![x](https://docs.mattermost.com/...)     -> images: null   (404)
 *   ![x](https://mattermost.com/...png)       -> images: {701x701}  (reachable third party)
 *   ![x](/files/{id}/public?h=...)            -> images: {1250x833} (public link, no session)
 *
 * A third-party host is what made this flaky on main: the *test server* has to reach it while
 * creating the post, so any egress hiccup or upstream 404 silently drops the metadata and the
 * test fails in the UI 10s later. A public link to a file we uploaded ourselves is served by the
 * same server under test, needs no session, and pins the exact bytes -- no outbound internet.
 *
 * image.png is 1250x833, under the 4096 ANDROID_MAX_WIDTH/HEIGHT cap in MarkdownImage, which is
 * a separate early return that would also drop the testID.
 */

describe('Messaging - Markdown Image', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;

    // Server-relative so it stays correct whichever SITE_1_URL this shard was handed.
    // MarkdownImage resolves a leading "/" against the connected server URL.
    let markdownImageUrl = '';

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;

        await enablePublicLinksForOwnHost();
        markdownImageUrl = await createPublicImageLink(testChannel.id);
        await requireServerPreloadsImage(testChannel.id, markdownImageUrl);

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

/**
 * Public links must be on, and the post-metadata fetcher must be allowed to connect to the
 * server's own host. That fetcher applies SSRF protection, so on a loopback or private-IP
 * site (local runs, docker) it refuses the request and the image is dropped from the metadata
 * even though the link itself serves fine. Both patches are additive and idempotent, and are
 * deliberately not reverted -- shards share a server, so an afterAll revert would race.
 */
async function enablePublicLinksForOwnHost(): Promise<void> {
    const {config, error} = await System.apiGetConfig(siteOneUrl);
    if (error || !config) {
        throw new Error(`markdown image setup: could not read server config: ${JSON.stringify(error)}`);
    }

    const host = new URL(siteOneUrl).hostname;
    const allowed = String(config.ServiceSettings?.AllowedUntrustedInternalConnections ?? '').split(/\s+/).filter(Boolean);
    const needsHost = !allowed.includes(host);
    const needsPublicLink = config.FileSettings?.EnablePublicLink !== true;
    if (!needsHost && !needsPublicLink) {
        return;
    }

    const patch: any = {};
    if (needsPublicLink) {
        patch.FileSettings = {EnablePublicLink: true};
    }
    if (needsHost) {
        patch.ServiceSettings = {AllowedUntrustedInternalConnections: [...allowed, host].join(' ')};
    }

    const {error: patchError} = await System.apiPatchConfig(siteOneUrl, patch);
    if (patchError) {
        throw new Error(`markdown image setup: could not enable public links: ${JSON.stringify(patchError)}`);
    }
}

/**
 * Upload the fixture, attach it to a post (the server rejects a public link for a dangling
 * upload), then return the link as a server-relative path.
 */
async function createPublicImageLink(channelId: string): Promise<string> {
    const {fileId} = await Post.apiCreatePostWithImageAttachment(siteOneUrl, channelId);

    const {link, error} = await Post.apiGetFilePublicLink(siteOneUrl, fileId);
    if (error || !link) {
        throw new Error(`markdown image setup: no public link for file ${fileId}: ${JSON.stringify(error)}`);
    }

    const {pathname, search} = new URL(link);
    return `${pathname}${search}`;
}

/**
 * Fail in setup, with the reason, rather than 10s later on an unexplained missing testID:
 * no metadata entry means renderImage returns null and the test can never pass.
 */
async function requireServerPreloadsImage(channelId: string, imageUrl: string): Promise<void> {
    // apiCreatePost throws on failure, so a returned post is always a real one.
    const {post} = await Post.apiCreatePost(siteOneUrl, {
        channelId,
        message: `markdown image metadata probe ${Date.now()}\n![probe](${imageUrl})`,
    });

    const images = post.metadata?.images ?? {};
    if (!images[imageUrl]) {
        throw new Error(
            `markdown image setup: server did not preload ${imageUrl} into post.metadata.images ` +
            `(got ${JSON.stringify(Object.keys(images))}). Markdown.renderImage returns null without it, ` +
            'so markdown_image would never render. Check FileSettings.EnablePublicLink and ' +
            'ServiceSettings.AllowedUntrustedInternalConnections for this host.',
        );
    }
}
