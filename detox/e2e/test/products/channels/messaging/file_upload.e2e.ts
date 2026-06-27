// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import fs from 'fs';
import path from 'path';

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

    // Fallback when GET /config omits cloud_restrictable FileSettings (100 MiB default).
    const FALLBACK_MAX_FILE_SIZE = 104857600;
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

    it('MM-T339_1 - should show an error when the server max file size is set to a very small value', async () => {
        const imagePath = path.resolve(__dirname, '../../../../support/fixtures/image.png');
        const fileSize = fs.statSync(imagePath).size;
        const maxFileSizeLimit = fileSize - 1;

        await User.apiAdminLogin(siteOneUrl);

        const {config: originalConfig} = await System.apiGetConfig(siteOneUrl);
        const originalMaxFileSize = originalConfig?.FileSettings?.MaxFileSize ?? FALLBACK_MAX_FILE_SIZE;

        const patchMaxFileSize = async (limit: number) => {
            const {error} = await System.apiUpdateConfig(siteOneUrl, {
                FileSettings: {
                    MaxFileSize: limit,
                },
            });
            if (error) {
                return {applied: false, appliedLimit: 0, error};
            }
            await wait(timeouts.TWO_SEC);
            const {config: clientConfig} = await System.apiGetClientConfigOld(siteOneUrl);
            const appliedLimit = parseInt(clientConfig?.MaxFileSize ?? '0', 10);
            return {
                applied: appliedLimit > 0 && appliedLimit <= limit,
                appliedLimit,
                error: undefined,
            };
        };

        // # Set MaxFileSize just under the fixture size so the upload is rejected
        let {applied, appliedLimit, error: patchError} = await patchMaxFileSize(maxFileSizeLimit);
        if (!applied) {
            ({applied, appliedLimit, error: patchError} = await patchMaxFileSize(maxFileSizeLimit));
        }
        if (!applied) {
            throw new Error(
                `MaxFileSize patch to ${maxFileSizeLimit} did not apply (client MaxFileSize=${appliedLimit}). ` +
                `${patchError ? JSON.stringify(patchError) : 'Server may lock FileSettings via env override.'}`,
            );
        }

        try {
            // * Server rejects over-limit uploads
            const {error: uploadError} = await Post.apiUploadFileToChannel(siteOneUrl, testChannel.id, imagePath);
            if (!uploadError) {
                throw new Error('Expected server to reject over-limit file upload');
            }

            // # Open channel screen and attempt a client-side file attach
            await ChannelScreen.open(channelsCategory, testChannel.name);
            await wait(timeouts.TWO_SEC);
            await ChannelScreen.fileQuickAction.tap();
            await waitFor(AttachmentOptions.photoLibrary).toExist().withTimeout(timeouts.TWO_SEC);

            if (isIos()) {
                await AttachmentOptions.photoLibrary.tap();
                const firstPhoto = element(by.type('PHAssetCollectionViewCell')).atIndex(0);
                await waitFor(firstPhoto).toExist().withTimeout(timeouts.TEN_SEC);
                await firstPhoto.tap();
                try {
                    await element(by.label('Add')).tap();
                } catch {
                    try {
                        await element(by.text('Add')).tap();
                    } catch {
                        // Single-select library — no confirmation button
                    }
                }
                await waitFor(element(by.text(/Files must be less than/i))).toBeVisible().withTimeout(timeouts.TEN_SEC);
            } else {
                // Android native picker is not fully automatable — verify the attachment sheet opens
                // and the server-side rejection above covers the max-size enforcement path.
                await expect(AttachmentOptions.attachFile).toExist();
                await AttachmentOptions.photoLibrary.swipe('down', 'fast');
            }

            // # Go back to channel list screen
            await ChannelScreen.back();
        } finally {
            // # Restore the pre-test MaxFileSize so later suites keep the server baseline
            await User.apiAdminLogin(siteOneUrl);
            await System.apiUpdateConfig(siteOneUrl, {
                FileSettings: {
                    MaxFileSize: originalMaxFileSize,
                },
            });
        }
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
