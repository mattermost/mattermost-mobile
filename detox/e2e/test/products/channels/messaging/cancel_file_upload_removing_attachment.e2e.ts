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
import {timeouts, wait} from '@support/utils';
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

    it('MM-T307_1 - should cancel a file upload by removing the attachment from the draft', async () => {
        // # Upload an image and create a post via API to get a file ID we can reference
        const {post, fileId} = await Post.apiCreatePostWithImageAttachment(siteOneUrl, testChannel.id);

        // # Open channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await wait(timeouts.TWO_SEC);

        // * Verify the posted message with the image attachment is visible
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, '');
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);
        const fileContainer = element(by.id(`${fileId}-file-container`));

        // iOS-26 wrapper-View visibility quirk — use toExist instead of toBeVisible.
        await waitFor(fileContainer).toExist().withTimeout(timeouts.TEN_SEC);

        // * Verify the posted attachment is visible in the channel
        await expect(fileContainer).toExist();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
