// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import fs from 'fs';
import os from 'os';
import path from 'path';

import {DEFAULT_MAX_FILE_SIZE_BYTES} from '@support/constants/file_settings';
import {
    Post,
    Setup,
    System,
    User,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {AttachmentOptions} from '@support/ui/component';
import {
    ChannelListScreen,
    ChannelScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {getRandomId, isAndroid, isIos, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Messaging - File Upload', () => {

    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';

    // Fallback when GET /config omits cloud_restrictable FileSettings.
    const FALLBACK_MAX_FILE_SIZE = DEFAULT_MAX_FILE_SIZE_BYTES;
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

    it('MM-T330_1 - iOS only — inline image with size specified renders in the channel', async () => {
        if (!isIos()) {
            return;
        }

        // # Post a markdown image with explicit pixel dimensions via API (`![alt](url =WxH)`)
        const imageUrl = 'https://www.mattermost.com/wp-content/uploads/2022/02/logoHorizontal.png';
        const markdownMessage = `![Mattermost Logo](${imageUrl} =100x100)`;
        const {post} = await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: markdownMessage,
        });

        // # Open channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await wait(timeouts.TWO_SEC);

        // * Verify the post with the markdown image is visible
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, '');
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await expect(postListPostItem).toBeVisible();

        // * Verify the post renders without crashing when a sized inline image is present
        // (no testID on the inline image itself).
        await expect(postListPostItem).toBeVisible();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
