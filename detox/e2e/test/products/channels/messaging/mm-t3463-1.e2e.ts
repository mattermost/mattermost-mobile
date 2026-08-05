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
import {isAndroid, isIos, timeouts, wait, waitForElementToExist, safeEnableSynchronization} from '@support/utils';
import {expect, waitFor} from 'detox';

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

    it('MM-T3463_1 - should open file preview gallery for a video file attachment', async () => {
        // # Upload an image file and create a post with it via API (simulating a file attachment)
        const {post, fileId} = await Post.apiCreatePostWithImageAttachment(siteOneUrl, testChannel.id);

        // # Open channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);

        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, '');
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Tap the file container thumbnail to open the file preview gallery
        const fileContainer = element(by.id(`${fileId}-file-container`));
        await waitFor(fileContainer).toExist().withTimeout(timeouts.TEN_SEC);

        // See MM-T3462 above for why we tap `${fileId}-file` (inner) not `-file-container`.
        await element(by.id(`${fileId}-file`)).tap();

        // * Verify file preview gallery is open (close button is present when gallery is mounted)
        const galleryCloseButton = element(by.id('gallery.header.close.button'));
        await waitFor(galleryCloseButton).toExist().withTimeout(timeouts.TEN_SEC);

        // # Dismiss the gallery and wait for overlay to clear
        await dismissGallery();

        // * Verify gallery is dismissed and channel screen is shown
        await waitFor(ChannelScreen.channelScreen).toExist().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
