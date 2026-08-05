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

    it('MM-T325_1 - should show attachment in the reply thread view', async () => {
        // # Create a text parent post so it is reliably long-pressable
        const parentMessage = `Parent post ${getRandomId()}`;
        const {post: parentPost} = await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: parentMessage,
        });

        // # Upload an image as a reply to the parent post via API
        const {post: replyPost, fileId} = await Post.apiCreatePostWithImageAttachment(
            siteOneUrl, testChannel.id, parentPost.id,
        );

        // # Open channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await wait(timeouts.TWO_SEC);

        // * Verify the parent post is visible in the channel
        const {postListPostItem: parentPostItem} = ChannelScreen.getPostListPostItem(parentPost.id, parentMessage);
        await waitFor(parentPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Open the reply thread by tapping the reply count footer on the parent post
        const {postListPostItemFooterReplyCount} = ChannelScreen.getPostListPostItem(parentPost.id, parentMessage);
        await waitFor(postListPostItemFooterReplyCount).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await postListPostItemFooterReplyCount.tap();
        await ThreadScreen.toBeVisible();

        // * Verify the reply post with attachment is visible in the thread
        const {postListPostItem: replyPostItem} = ThreadScreen.getPostListPostItem(replyPost.id, '');
        await waitFor(replyPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // * Verify the attachment container is visible (iOS-26 wrapper-View quirk — use toExist).
        const fileContainer = element(by.id(`${fileId}-file-container`));
        await waitFor(fileContainer).toExist().withTimeout(timeouts.TEN_SEC);
        await expect(fileContainer).toExist();

        // # Tap the inner `${fileId}-file` testID — outer `-file-container` has marginTop
        // that drops Detox visibility below the tap threshold.
        await element(by.id(`${fileId}-file`)).tap();
        await wait(timeouts.TWO_SEC);

        // * Verify gallery opens
        const galleryCloseButton = element(by.id('gallery.header.close.button'));
        await waitFor(galleryCloseButton).toExist().withTimeout(timeouts.TEN_SEC);

        // # Dismiss the gallery — .atIndex(0) on iOS works around RNGH exposing the same
        // testID on both outer wrapper and inner Button ("Multiple elements found").
        if (isAndroid()) {
            await device.pressBack();
        } else {
            await element(by.id('gallery.header.close.button')).atIndex(0).tap();
        }
        await waitFor(galleryCloseButton).not.toExist().withTimeout(timeouts.TEN_SEC);
        await wait(timeouts.ONE_SEC);

        // * Verify thread screen is shown again
        await waitFor(ThreadScreen.threadScreen).toExist().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await ThreadScreen.back();
        await ChannelScreen.back();
    });
});
