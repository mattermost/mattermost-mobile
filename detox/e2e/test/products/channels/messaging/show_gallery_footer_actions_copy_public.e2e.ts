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
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {isAndroid, isIos, timeouts, wait, safeEnableSynchronization} from '@support/utils';
import {waitFor} from 'detox';

// iOS gallery close uses atIndex(0) because RNGH duplicates the testID.
const dismissGallery = async () => {
    if (isAndroid()) {
        await device.pressBack();
    } else {
        await element(by.id('gallery.header.close.button')).atIndex(0).tap();
    }
    await waitFor(element(by.id('gallery.header.close.button'))).not.toExist().withTimeout(timeouts.TEN_SEC);
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
            await waitFor(element(by.id('gallery.header.close.button'))).not.toExist().withTimeout(timeouts.TEN_SEC);
        } catch { /* gallery not open */ }

        try {
            await waitFor(ChannelScreen.channelScreen).toExist().withTimeout(timeouts.ONE_SEC);
            await ChannelScreen.back();
        } catch { /* not on channel screen */ }

        await ChannelListScreen.toBeVisible();
    });

    (isIos() ? it.skip : it)('MM-T3458_1 - should show gallery footer actions and copy public link when enabled', async () => {
        // # Upload an image and create a post via API
        const {post, fileId} = await Post.apiCreatePostWithImageAttachment(siteOneUrl, testChannel.id);

        // # Open channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);

        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, '');
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Tap the file container to open the file preview gallery
        const fileContainer = element(by.id(`${fileId}-file-container`));
        await waitFor(fileContainer).toExist().withTimeout(timeouts.TEN_SEC);

        // See MM-T3462 above for why we tap `${fileId}-file` (inner) not `-file-container`.
        await element(by.id(`${fileId}-file`)).tap();

        // * Verify file preview gallery is open
        const galleryCloseButton = element(by.id('gallery.header.close.button'));
        await waitFor(galleryCloseButton).toExist().withTimeout(timeouts.TEN_SEC);

        // # Tap the copy public link button in the gallery footer.
        // atIndex(0): iOS exposes the same testID on several ancestor views and index 0 receives
        // the touch. Wait for visibility first — the footer mounts after the header.
        const copyPublicLinkButton = element(by.id('gallery.footer.copy_public_link.button')).atIndex(0);
        if (isAndroid()) {
            await waitFor(copyPublicLinkButton).toExist().withTimeout(timeouts.TEN_SEC);
        } else {
            await waitFor(copyPublicLinkButton).toBeVisible().withTimeout(timeouts.TEN_SEC);
        }

        // Wait for the gallery open animation to settle: the UITransitionView overlay still
        // intercepts taps after toBeVisible() resolves.
        await wait(timeouts.TWO_SEC);
        await device.disableSynchronization();
        try {
            await copyPublicLinkButton.tap();

            // fetchPublicLink is async and the toast mounts after it returns. Android edge-to-edge
            // fails the visibility threshold on toast.message, so poll by the copy text instead.
            await waitFor(element(by.text('Link copied to clipboard'))).
                toExist().
                withTimeout(timeouts.HALF_MIN);
        } finally {
            await safeEnableSynchronization();
        }

        // # Dismiss the gallery and wait for overlay to clear
        await dismissGallery();

        // * Verify gallery is dismissed
        await waitFor(ChannelScreen.channelScreen).toExist().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
