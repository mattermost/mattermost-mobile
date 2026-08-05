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
import {getRandomId, isAndroid, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Messaging - File Upload', () => {

    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';

    // Fallback when GET /config omits cloud_restrictable FileSettings.
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

    it('MM-T328_1 - should show multiple attachments in post after sending via API', async () => {
        // Full UI multi-file selection from a picker isn't automatable in Detox — upload via API.

        // # Upload two images to the channel via API
        const {fileId: fileId1} = await Post.apiUploadFileToChannel(siteOneUrl, testChannel.id, require('path').resolve(__dirname, '../../../../support/fixtures/image.png'));

        const {fileId: fileId2} = await Post.apiUploadFileToChannel(siteOneUrl, testChannel.id, require('path').resolve(__dirname, '../../../../support/fixtures/image.png'));

        // # Create a post with both file IDs attached
        const message = `Multi-attachment post ${getRandomId()}`;
        const {post} = await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message,
            fileIds: [fileId1, fileId2],
        });

        // # Open channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await wait(timeouts.TWO_SEC);

        // * Verify the post is visible in the channel
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, message);
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // * Verify the first attachment container is visible (iOS-26 wrapper-View quirk — use toExist).
        const fileContainer1 = element(by.id(`${fileId1}-file-container`));
        await waitFor(fileContainer1).toExist().withTimeout(timeouts.TEN_SEC);
        await expect(fileContainer1).toExist();

        // * Verify the second attachment container is visible in the post
        const fileContainer2 = element(by.id(`${fileId2}-file-container`));
        await waitFor(fileContainer2).toExist().withTimeout(timeouts.TEN_SEC);
        await expect(fileContainer2).toExist();

        // # Tap the inner `${fileId}-file` testID to open the gallery (see MM-T325_1).
        await element(by.id(`${fileId1}-file`)).tap();
        await wait(timeouts.TWO_SEC);

        // * Verify gallery opens
        const galleryCloseButton = element(by.id('gallery.header.close.button'));
        await waitFor(galleryCloseButton).toExist().withTimeout(timeouts.TEN_SEC);

        // # Dismiss gallery — .atIndex(0) on iOS for RNGH duplicate testID (see MM-T325_1).
        if (isAndroid()) {
            await device.pressBack();
        } else {
            await element(by.id('gallery.header.close.button')).atIndex(0).tap();
        }
        await waitFor(galleryCloseButton).not.toExist().withTimeout(timeouts.TEN_SEC);
        await wait(timeouts.ONE_SEC);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
