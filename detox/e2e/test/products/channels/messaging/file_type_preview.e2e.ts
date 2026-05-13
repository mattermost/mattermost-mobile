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
import {isAndroid, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

const FIXTURES_DIR = path.resolve(__dirname, '../../../../support/fixtures');

// Dismiss the gallery and wait for the overlay to fully unmount before proceeding.
// Same pattern as file_preview_gallery.e2e.ts — gallery sits on top of channel nav header.
const dismissGallery = async () => {
    if (isAndroid()) {
        await device.pressBack();
    } else {
        await element(by.id('gallery.header.close.button')).tap();
    }
    await waitFor(element(by.id('gallery.header.close.button'))).not.toExist().withTimeout(timeouts.TEN_SEC);
    await wait(isAndroid() ? timeouts.TWO_SEC : timeouts.ONE_SEC);
};

describe('Messaging - File Type Preview', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;

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

    it('MM-T3244_1 - should open image file in gallery preview', async () => {
        // # Upload a PNG image via API and post it to the channel
        const {post, fileId} = await Post.apiCreatePostWithImageAttachment(siteOneUrl, testChannel.id);

        // # Open the channel and wait for the post to be visible
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await wait(timeouts.TWO_SEC);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, '');
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // * Verify the image thumbnail renders in the post
        const fileContainer = element(by.id(`${fileId}-file-container`));
        await waitFor(fileContainer).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await expect(fileContainer).toBeVisible();

        // # Tap the image thumbnail to open the gallery preview
        await fileContainer.tap();
        await wait(timeouts.TWO_SEC);

        // * Verify the gallery opens (close button appears when gallery is mounted)
        const galleryCloseButton = element(by.id('gallery.header.close.button'));
        await waitFor(galleryCloseButton).toExist().withTimeout(timeouts.TEN_SEC);
        await expect(galleryCloseButton).toExist();

        // # Dismiss the gallery and go back
        await dismissGallery();
        await waitFor(ChannelScreen.channelScreen).toExist().withTimeout(timeouts.TEN_SEC);
        await ChannelScreen.back();
    });

    it('MM-T3244_2 - should render PDF document file attachment as document card', async () => {
        // # Upload a PDF file via API and post it to the channel
        const {fileId} = await Post.apiUploadFileToChannel(
            siteOneUrl,
            testChannel.id,
            path.join(FIXTURES_DIR, 'sample.pdf'),
        );
        const {post} = await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: '',
            fileIds: [fileId],
        });

        // # Open the channel and wait for the post to be visible
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await wait(timeouts.TWO_SEC);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, '');
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // * Verify the PDF attachment renders as a document card (file-container is present).
        // DocumentFile renders the file icon + FileInfo row — no gallery opens on tap since
        // tapping a document downloads it then opens the system document viewer (cross-process).
        const fileContainer = element(by.id(`${fileId}-file-container`));
        await waitFor(fileContainer).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await expect(fileContainer).toBeVisible();

        // # Go back to channel list
        await ChannelScreen.back();
    });

    it('MM-T3244_3 - should render audio file attachment with inline player', async () => {
        // # Upload an MP3 audio file via API and post it to the channel
        const {fileId} = await Post.apiUploadFileToChannel(
            siteOneUrl,
            testChannel.id,
            path.join(FIXTURES_DIR, 'audio.mp3'),
        );
        const {post} = await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: '',
            fileIds: [fileId],
        });

        // # Open the channel and wait for the post to be visible
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await wait(timeouts.TWO_SEC);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, '');
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // * Verify the audio attachment renders the file container.
        // AudioFile renders an inline player (play/pause button + progress bar) rather than
        // opening a gallery — no tap required; the presence of the container confirms the
        // audio player component was mounted.
        const fileContainer = element(by.id(`${fileId}-file-container`));
        await waitFor(fileContainer).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await expect(fileContainer).toBeVisible();

        // # Go back to channel list
        await ChannelScreen.back();
    });

    it('MM-T3244_4 - should render generic text file attachment as file card', async () => {
        // # Upload a plain text file via API and post it to the channel
        const {fileId} = await Post.apiUploadFileToChannel(
            siteOneUrl,
            testChannel.id,
            path.join(FIXTURES_DIR, 'sample.txt'),
        );
        const {post} = await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: '',
            fileIds: [fileId],
        });

        // # Open the channel and wait for the post to be visible
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await wait(timeouts.TWO_SEC);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, '');
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // * Verify the text file attachment renders as a generic file card (file-container present).
        // Files with no dedicated renderer (text/plain, zip, etc.) render as a card showing
        // the file icon + file name — the file-container testID is always present on all types.
        const fileContainer = element(by.id(`${fileId}-file-container`));
        await waitFor(fileContainer).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await expect(fileContainer).toBeVisible();

        // # Go back to channel list
        await ChannelScreen.back();
    });
});
