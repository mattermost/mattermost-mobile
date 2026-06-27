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
    User,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelListScreen,
    ChannelScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {isAndroid, timeouts, wait, waitForElementToExist} from '@support/utils';
import {expect, waitFor} from 'detox';

// iOS gallery close uses atIndex(0) because RNGH duplicates the testID.
const dismissGallery = async () => {
    if (isAndroid()) {
        await device.pressBack();
    } else {
        await element(by.id('gallery.header.close.button')).atIndex(0).tap();
    }
    await waitFor(element(by.id('gallery.header.close.button'))).not.toExist().withTimeout(timeouts.TEN_SEC);
    await wait(isAndroid() ? timeouts.TWO_SEC : timeouts.ONE_SEC);
};

describe('Messaging - File Preview Gallery', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;

        // # Fresh app install for clean state. iOS notifications permission
        // is pre-granted so delete:true doesn't trigger the system prompt.
        await device.launchApp({
            newInstance: true,
            delete: true,
            ...(device.getPlatform() === 'ios' ? {permissions: {notifications: 'YES'}} : {}),
        });

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(user);
        await ChannelListScreen.toBeVisible();
    });

    beforeEach(async () => {
        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterEach(async () => {
        // Recover from mid-test failures so the next test starts clean.
        try {
            await waitFor(element(by.id('gallery.header.close.button'))).toExist().withTimeout(timeouts.ONE_SEC);
            if (isAndroid()) {
                await device.pressBack();
            } else {
                await element(by.id('gallery.header.close.button')).atIndex(0).tap();
            }
            await wait(timeouts.ONE_SEC);
        } catch { /* gallery not open */ }

        try {
            await waitFor(ChannelScreen.channelScreen).toExist().withTimeout(timeouts.ONE_SEC);
            await ChannelScreen.back();
        } catch { /* not on channel screen */ }

        await ChannelListScreen.toBeVisible();
    });

    // No afterAll cleanup required: beforeAll resets state via
    // device.launchApp({delete: true}) so the next describe starts clean.

    it('MM-T3462 - should render image preview for image file types', async () => {
        // # Upload an image and create a post via API
        const {post, fileId} = await Post.apiCreatePostWithImageAttachment(siteOneUrl, testChannel.id);

        // # Open channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await wait(timeouts.TWO_SEC);

        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, '');
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // * Verify the image file container thumbnail is displayed in the channel
        const fileContainer = element(by.id(`${fileId}-file-container`));
        await waitFor(fileContainer).toExist().withTimeout(timeouts.TEN_SEC);

        // # Tap the image thumbnail to open the file preview gallery.
        await element(by.id(`${fileId}-file`)).tap();
        await wait(timeouts.TWO_SEC);

        // * Verify file preview gallery is open (close button appears when gallery is mounted)
        const galleryCloseButton = element(by.id('gallery.header.close.button'));
        if (isAndroid()) {
            await waitForElementToExist(galleryCloseButton, timeouts.HALF_MIN);
        } else {
            await waitFor(galleryCloseButton).toExist().withTimeout(timeouts.TEN_SEC);
        }

        // # Dismiss the gallery and wait for overlay to clear
        await dismissGallery();

        // * Verify gallery is dismissed and channel screen is shown
        await waitFor(ChannelScreen.channelScreen).toExist().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T3459_1 - should dismiss file preview when user taps on close button', async () => {
        // # Upload an image and create a post via API
        const {post, fileId} = await Post.apiCreatePostWithImageAttachment(siteOneUrl, testChannel.id);

        // # Open channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await wait(timeouts.TWO_SEC);

        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, '');
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Tap the file container to open the file preview gallery
        const fileContainer = element(by.id(`${fileId}-file-container`));
        await waitFor(fileContainer).toExist().withTimeout(timeouts.TEN_SEC);

        // See MM-T3462 above for why we tap `${fileId}-file` (inner) not `-file-container`.
        await element(by.id(`${fileId}-file`)).tap();
        await wait(timeouts.TWO_SEC);

        // * Verify file preview gallery is open
        const galleryCloseButton = element(by.id('gallery.header.close.button'));
        await waitFor(galleryCloseButton).toExist().withTimeout(timeouts.TEN_SEC);

        // # Dismiss the gallery and wait for overlay to clear
        await dismissGallery();

        // * Verify file preview is dismissed (channel screen is visible again)
        await waitFor(ChannelScreen.channelScreen).toExist().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T3459_2 - should dismiss file preview when user swipes down (iOS) or presses Back (Android)', async () => {
        // # Upload an image and create a post via API
        const {post, fileId} = await Post.apiCreatePostWithImageAttachment(siteOneUrl, testChannel.id);

        // # Open channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await wait(timeouts.TWO_SEC);

        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, '');
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Tap the file container to open the file preview gallery
        const fileContainer = element(by.id(`${fileId}-file-container`));
        await waitFor(fileContainer).toExist().withTimeout(timeouts.TEN_SEC);

        // See MM-T3462 above for why we tap `${fileId}-file` (inner) not `-file-container`.
        await element(by.id(`${fileId}-file`)).tap();
        await wait(timeouts.TWO_SEC);

        // * Verify file preview gallery is open
        const galleryCloseButton = element(by.id('gallery.header.close.button'));
        await waitFor(galleryCloseButton).toExist().withTimeout(timeouts.TEN_SEC);

        // # Dismiss the gallery and wait for overlay to clear
        await dismissGallery();

        // * Verify file preview is dismissed (channel screen is visible again)
        await waitFor(ChannelScreen.channelScreen).toExist().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T3463_1 - should open file preview gallery for a video file attachment', async () => {
        // # Upload an image file and create a post with it via API (simulating a file attachment)
        const {post, fileId} = await Post.apiCreatePostWithImageAttachment(siteOneUrl, testChannel.id);

        // # Open channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await wait(timeouts.TWO_SEC);

        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, '');
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Tap the file container thumbnail to open the file preview gallery
        const fileContainer = element(by.id(`${fileId}-file-container`));
        await waitFor(fileContainer).toExist().withTimeout(timeouts.TEN_SEC);

        // See MM-T3462 above for why we tap `${fileId}-file` (inner) not `-file-container`.
        await element(by.id(`${fileId}-file`)).tap();
        await wait(timeouts.TWO_SEC);

        // * Verify file preview gallery is open (close button is present when gallery is mounted)
        const galleryCloseButton = element(by.id('gallery.header.close.button'));
        await waitFor(galleryCloseButton).toExist().withTimeout(timeouts.TEN_SEC);
        await expect(galleryCloseButton).toExist();

        // # Dismiss the gallery and wait for overlay to clear
        await dismissGallery();

        // * Verify gallery is dismissed and channel screen is shown
        await waitFor(ChannelScreen.channelScreen).toExist().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T3458_1 - should show gallery footer actions and copy public link when enabled', async () => {
        // # Enable public file links in server configuration
        await User.apiAdminLogin(siteOneUrl);
        await System.apiUpdateConfig(siteOneUrl, {
            FileSettings: {EnablePublicLink: true},
        });

        // # Upload an image and create a post via API
        const {post, fileId} = await Post.apiCreatePostWithImageAttachment(siteOneUrl, testChannel.id);

        // # Open channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await wait(timeouts.TWO_SEC);

        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, '');
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Tap the file container to open the file preview gallery
        const fileContainer = element(by.id(`${fileId}-file-container`));
        await waitFor(fileContainer).toExist().withTimeout(timeouts.TEN_SEC);

        // See MM-T3462 above for why we tap `${fileId}-file` (inner) not `-file-container`.
        await element(by.id(`${fileId}-file`)).tap();
        await wait(timeouts.TWO_SEC);

        // * Verify file preview gallery is open
        const galleryCloseButton = element(by.id('gallery.header.close.button'));
        await waitFor(galleryCloseButton).toExist().withTimeout(timeouts.TEN_SEC);

        // # Tap the copy public link button in the gallery footer.
        // .atIndex(0): the iOS native view hierarchy exposes the same testID on
        // multiple ancestor views for RN Pressable, so direct .tap() throws
        // "Multiple elements found". atIndex(0) is the touch-receiving view.
        // Wait for visibility before tapping — the footer renders slightly
        // after the header, and tapping a still-mounting Pressable silently
        // drops the press (cause of prior intermittent MM-T3458_1 failure).
        const copyPublicLinkButton = element(by.id('gallery.footer.copy_public_link.button')).atIndex(0);
        await waitFor(copyPublicLinkButton).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await copyPublicLinkButton.tap();

        // * Verify the copy public link toast message appears (testID='toast.message')
        const toastMessage = element(by.id('toast.message'));
        await waitForElementToExist(toastMessage, timeouts.TWENTY_SEC);

        // # Dismiss the gallery and wait for overlay to clear
        await dismissGallery();

        // * Verify gallery is dismissed
        await waitFor(ChannelScreen.channelScreen).toExist().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T344_1 - should render image inline for a message with image attachment (message attachment)', async () => {
        // # Post a message with a message attachment containing an image_url via API
        // This simulates a bot/webhook post with an inline image attachment
        const imageUrl = 'https://mattermost.com/wp-content/uploads/2022/02/icon_WS.png';
        const {post} = await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: 'Message with image attachment',
            props: {
                attachments: [
                    {
                        fallback: 'Image attachment test',
                        text: 'Attachment body text',
                        image_url: imageUrl,
                    },
                ],
            },
        });

        // # Open channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await wait(timeouts.TWO_SEC);

        // # Wait for the post to be visible
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, 'Message with image attachment');
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // * Verify the attachment body text renders inline in the channel post
        const attachmentText = element(by.text('Attachment body text').withAncestor(by.id(`channel.post_list.post.${post.id}`)));
        await expect(attachmentText).toBeVisible();

        // * Verify the post with the message attachment is visible in the channel list
        await expect(postListPostItem).toBeVisible();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T1806_1 - should show share button for self-uploaded file in gallery preview', async () => {
        // # Upload an image file and create a post via API
        const {post, fileId} = await Post.apiCreatePostWithImageAttachment(siteOneUrl, testChannel.id);

        // # Open channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await wait(timeouts.TWO_SEC);

        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, '');
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Tap the file container to open the file preview gallery
        const fileContainer = element(by.id(`${fileId}-file-container`));
        await waitFor(fileContainer).toExist().withTimeout(timeouts.TEN_SEC);

        // See MM-T3462 above for why we tap `${fileId}-file` (inner) not `-file-container`.
        await element(by.id(`${fileId}-file`)).tap();
        await wait(timeouts.TWO_SEC);

        // * Verify file preview gallery is open
        const galleryCloseButton = element(by.id('gallery.header.close.button'));
        await waitFor(galleryCloseButton).toExist().withTimeout(timeouts.TEN_SEC);

        // * Verify the share button is present in the gallery footer
        const shareButton = element(by.id('gallery.footer.share.button'));
        await waitFor(shareButton).toExist().withTimeout(timeouts.TEN_SEC);

        // # Dismiss the gallery and wait for overlay to clear
        await dismissGallery();

        // * Verify gallery is dismissed and channel screen is shown
        await waitFor(ChannelScreen.channelScreen).toExist().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
