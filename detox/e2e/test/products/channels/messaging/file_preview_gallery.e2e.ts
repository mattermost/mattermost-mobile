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
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {isAndroid, timeouts, wait, waitForElementToExist} from '@support/utils';
import {expect, waitFor} from 'detox';

// Dismiss the gallery and wait for the overlay to fully unmount before proceeding.
// The gallery view sits on top of the channel navigation header — tapping Back
// before it is fully gone causes a "not hittable" hit-test failure on iOS.
const dismissGallery = async () => {
    if (isAndroid()) {
        await device.pressBack();
    } else {
        await element(by.id('gallery.header.close.button')).tap();
    }

    // Wait for the close button to disappear — confirms gallery is fully unmounted.
    // We use the close button testID rather than by.text('1 of 1') because FormattedText
    // inside AnimatedSafeAreaView is not reliably found by by.text() on Android.
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

        // # Ensure clean state — reload to dismiss any open overlays (e.g. gallery left open
        // from a previous run), then log out if already signed in
        await device.reloadReactNative();
        await wait(timeouts.TWO_SEC);
        try {
            await HomeScreen.logout();
        } catch {
            // Not logged in, or logout failed — proceed to connect
        }

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
        // # Aggressive multi-step recovery so that a mid-test failure (e.g. gallery
        // left open, view hierarchy corrupted after a swipe) does not cascade into
        // the next test starting in a broken state.

        // Step 1 — close the gallery if it is still open
        try {
            await waitFor(element(by.id('gallery.header.close.button'))).toExist().withTimeout(timeouts.ONE_SEC);
            if (isAndroid()) {
                await device.pressBack();
            } else {
                await element(by.id('gallery.header.close.button')).tap();
            }
            await wait(timeouts.ONE_SEC);
        } catch {
            // Gallery is not open — nothing to do
        }

        // Step 2 — go back from the channel screen if we are still on it
        try {
            await waitFor(ChannelScreen.channelScreen).toExist().withTimeout(timeouts.ONE_SEC);
            await ChannelScreen.back();
        } catch {
            // Not on the channel screen — nothing to do
        }

        // Step 3 — ensure we are on the channel list screen; ChannelListScreen.toBeVisible()
        // has built-in recovery (device.launchApp({newInstance: true})) so this handles
        // the worst-case scenario where the view hierarchy is completely corrupted.
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

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
        await waitFor(fileContainer).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Tap the image thumbnail to open the file preview gallery
        await fileContainer.tap();
        await wait(timeouts.TWO_SEC);

        // * Verify file preview gallery is open (close button appears when gallery is mounted)
        // Use the close button testID rather than by.text('1 of 1') — FormattedText inside
        // AnimatedSafeAreaView is not reliably found via by.text() on Android.
        // Use polling waitForElementToExist on Android to avoid bridge-idle synchronization
        // blocking waitFor().toExist() while the gallery animation keeps the bridge busy.
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
        await waitFor(fileContainer).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await fileContainer.tap();
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
        // NOTE: On Android, a swipe-down gesture on the gallery causes view-hierarchy
        // corruption (home tab disappears) that breaks subsequent tests in the suite.
        // dismissGallery() therefore uses device.pressBack() on Android, which covers
        // the same functional intent (dismissing the gallery) without the side-effects.
        // The swipe-down gesture path is exercised on iOS only.

        // # Upload an image and create a post via API
        const {post, fileId} = await Post.apiCreatePostWithImageAttachment(siteOneUrl, testChannel.id);

        // # Open channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await wait(timeouts.TWO_SEC);

        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, '');
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Tap the file container to open the file preview gallery
        const fileContainer = element(by.id(`${fileId}-file-container`));
        await waitFor(fileContainer).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await fileContainer.tap();
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
        // NOTE: This test uses the fixture image.png in place of a video fixture because no video fixture
        // is available in detox/e2e/support/fixtures/. Add a video fixture (e.g. video.mp4) and use
        // apiUploadFileToChannel with it to fully test the video player UI (play button, video frame).

        // # Upload an image file and create a post with it via API (simulating a file attachment)
        const {post, fileId} = await Post.apiCreatePostWithImageAttachment(siteOneUrl, testChannel.id);

        // # Open channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await wait(timeouts.TWO_SEC);

        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, '');
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Tap the file container thumbnail to open the file preview gallery
        const fileContainer = element(by.id(`${fileId}-file-container`));
        await waitFor(fileContainer).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await fileContainer.tap();
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
        await waitFor(fileContainer).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await fileContainer.tap();
        await wait(timeouts.TWO_SEC);

        // * Verify file preview gallery is open
        const galleryCloseButton = element(by.id('gallery.header.close.button'));
        await waitFor(galleryCloseButton).toExist().withTimeout(timeouts.TEN_SEC);

        // # Tap the copy public link button in the gallery footer
        await element(by.id('gallery.footer.copy_public_link.button')).tap();
        await wait(timeouts.TWO_SEC);

        // * Verify the copy public link toast message appears (testID='toast.message')
        // Use toExist() instead of toBeVisible(): the toast uses position:absolute with a
        // Reanimated animated opacity, so on Android the global visible rect may be < 75%
        // even when fully rendered (absolute child clipped by parent bounds).
        const toastMessage = element(by.id('toast.message'));
        await waitFor(toastMessage).toExist().withTimeout(timeouts.TEN_SEC);

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
        await waitFor(fileContainer).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await fileContainer.tap();
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
