// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import path from 'path';

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    ChannelBookmark,
    Channel,
    Post,
    Setup,
} from '@support/server_api';
import {serverOneUrl, siteOneUrl} from '@support/test_config';
import {
    ChannelBookmarkScreen,
    ChannelInfoScreen,
    ChannelListScreen,
    ChannelScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {isAndroid, isIos, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Channels - Channel Bookmarks', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testTeam: any;
    let testUser: any;
    let channelT5600: any;
    let channelT5601: any;
    let channelT5605: any;
    let channelT5607: any;
    let channelT5609: any;
    let channelT5610: any;
    let bookmarkT5610: any;

    const createChannel = async () => {
        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {
            type: 'O',
            teamId: testTeam.id,
        });
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, channel.id);
        return channel;
    };

    // Scroll channel list to top after FlashList mounts — off-screen channels need scroll-down from top.
    const openChannel = async (channel: any) => {
        const displayNameEl = ChannelListScreen.getChannelItemDisplayName(channelsCategory, channel.name);
        await waitFor(element(by.id('channel_list.flat_list'))).
            toExist().
            withTimeout(timeouts.TEN_SEC);

        if (isIos()) {
            await device.disableSynchronization();
        }

        await element(by.id('channel_list.flat_list')).scrollTo('top');

        if (isIos()) {
            try {
                await waitFor(displayNameEl).
                    toBeVisible().
                    whileElement(by.id('channel_list.flat_list')).
                    scroll(100, 'down', 0.5, 0.3);
            } catch {
                // Fall through to tap() — element may be at the bottom edge with < 75%
                // visibility but a hittable center point.
            }
        } else {
            await waitFor(displayNameEl).
                toBeVisible().
                whileElement(by.id('channel_list.flat_list')).
                scroll(100, 'down');
        }

        await displayNameEl.tap();

        if (isIos()) {
            await device.enableSynchronization();
        }

        await ChannelScreen.dismissScheduledPostTooltip();
        const channelScreen = await ChannelScreen.toBeVisible();
        if (isIos()) {
            await wait(timeouts.TWO_SEC);
        }
        return channelScreen;
    };

    beforeAll(async () => {
        const {team, user} = await Setup.apiInit(siteOneUrl);
        testTeam = team;
        testUser = user;

        // ── Create all test channels ──────────────────────────────────────────
        channelT5600 = await createChannel();
        channelT5601 = await createChannel();
        channelT5605 = await createChannel();
        channelT5607 = await createChannel();
        channelT5609 = await createChannel();
        channelT5610 = await createChannel();

        // ── Pre-create bookmarks ──────────────────────────────────────────────
        const {bookmark: bT5610} = await ChannelBookmark.apiCreateChannelBookmarkLink(
            siteOneUrl, channelT5610.id, 'Original Bookmark', 'https://mattermost.com',
        );
        if (!bT5610?.id) {
            throw new Error('[beforeAll] Failed to create bookmarkT5610');
        }
        bookmarkT5610 = bT5610;

        await ChannelBookmark.apiCreateChannelBookmarkLink(
            siteOneUrl, channelT5605.id, 'No Favicon Bookmark', 'https://example.com',
        );
        await ChannelBookmark.apiCreateChannelBookmarkLink(
            siteOneUrl, channelT5607.id, 'Revert Emoji Test', 'https://example.com',
        );
        await ChannelBookmark.apiCreateChannelBookmarkLink(
            siteOneUrl, channelT5609.id, 'Banner Test Bookmark', 'https://mattermost.com',
        );

        // ── Single login + reload to sync all API-created data ────────────────
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();
    });

    beforeEach(async () => {
        await ChannelListScreen.toBeVisible();
    });

    afterEach(async () => {
        // Android safety net: Back up to 4x only if channel_list.screen not visible.
        if (isAndroid()) {
            for (let i = 0; i < 4; i++) {
                try {
                    // eslint-disable-next-line no-await-in-loop
                    await waitFor(element(by.id('channel_list.screen'))).
                        toExist().
                        withTimeout(timeouts.ONE_SEC);
                    break; // Channel list is already showing — stop pressing back
                } catch {
                    // Not at channel list yet — dismiss the top-most layer
                    // eslint-disable-next-line no-await-in-loop
                    await device.pressBack();
                    // eslint-disable-next-line no-await-in-loop
                    await wait(timeouts.ONE_SEC);
                }
            }
        }
        try {
            await HomeScreen.channelListTab.tap();
        } catch {
            // Best-effort
        }
        await wait(timeouts.ONE_SEC);
    });

    afterAll(async () => {
        await HomeScreen.logout();
    });

    it('MM-T5600_1 - should show Add bookmark option in channel info on licensed server', async () => {
        // # Navigate to a channel
        await openChannel(channelT5600);

        // # Open channel info
        await ChannelInfoScreen.open();

        // * Verify that the "Add a bookmark" option is visible in channel info (Bookmarks Bar)
        await expect(element(by.text('Add a bookmark'))).toBeVisible();

        // # Go back to channel list
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T5601_1 - should show Add bookmark option when no bookmarks exist in channel', async () => {
        // # Navigate to a new channel with no bookmarks
        await openChannel(channelT5601);

        // # Open channel info screen
        await ChannelInfoScreen.open();

        // * Verify "Add a bookmark" option is displayed even with no existing bookmarks
        await expect(element(by.text('Add a bookmark'))).toBeVisible();

        // # Go back to channel list
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T5610_1 - should be able to edit a bookmark link', async () => {
        // # Navigate to the channel
        await openChannel(channelT5610);

        // # Open channel info to see the bookmark
        await ChannelInfoScreen.open();

        // * Verify the bookmark exists in channel info
        const bookmarkEl = element(
            by.
                id(`channel_bookmark.${bookmarkT5610.id}`).
                withAncestor(by.id('channel_info.bookmarks.list')),
        );
        await waitFor(bookmarkEl).toExist().withTimeout(timeouts.TEN_SEC);

        // # Long press on the bookmark to open options
        await bookmarkEl.longPress();

        // * Verify bookmark options appear
        await expect(ChannelBookmarkScreen.editOption).toBeVisible();

        // # Tap Edit
        await ChannelBookmarkScreen.editOption.tap();

        // * Verify the Edit bookmark modal opens
        await ChannelBookmarkScreen.toBeVisible();

        // # Clear the title and enter a new title
        const titleInput = ChannelBookmarkScreen.getTitleInput();
        await titleInput.clearText();
        await titleInput.replaceText('Updated Bookmark');
        await ChannelBookmarkScreen.waitForTitleValue('Updated Bookmark');

        // # Tap save button
        await waitFor(ChannelBookmarkScreen.saveButton).
            toBeVisible().
            withTimeout(timeouts.TEN_SEC);
        await ChannelBookmarkScreen.saveButton.tap();

        // * Verify the edit modal closed (save was successful)
        await waitFor(ChannelBookmarkScreen.channelBookmarkScreen).
            not.toExist().
            withTimeout(timeouts.TEN_SEC);

        // Scope to channel_info.bookmarks.list; use toExist() — RNN dual-list + iOS modal overlays.
        await waitFor(
            element(
                by.text('Updated Bookmark').
                    withAncestor(by.id('channel_info.bookmarks.list')),
            ),
        ).toExist().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T5605_1 - should show fallback bookmark icon when no favicon is found', async () => {
        // # Navigate to the channel
        await openChannel(channelT5605);

        // # Open channel info to see the bookmark
        await ChannelInfoScreen.open();

        // Scope to channel_info.bookmarks.list — same text also in channel_header behind modal.
        await expect(
            element(
                by.text('No Favicon Bookmark').
                    withAncestor(by.id('channel_info.bookmarks.list')),
            ),
        ).toBeVisible();

        // Scope generic icon to channel_info.bookmarks.list (dual-list ambiguity).
        await expect(
            element(
                by.id('bookmark-generic-icon').
                    withAncestor(by.id('channel_info.bookmarks.list')),
            ),
        ).toBeVisible();

        // # Go back to channel list
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T5607_1 - should be able to revert bookmark icon from emoji to default', async () => {
        // # Navigate to the channel
        await openChannel(channelT5607);

        // # Open channel info
        await ChannelInfoScreen.open();

        // * Verify bookmark visible in channel_info — scope to avoid matching
        // channel_header.bookmarks.list behind the modal.
        const revertBookmarkEl = element(
            by.text('Revert Emoji Test').
                withAncestor(by.id('channel_info.bookmarks.list')),
        );
        await expect(revertBookmarkEl).toBeVisible();

        // # Long press to open options
        await revertBookmarkEl.longPress();

        // * Verify edit option visible
        await expect(ChannelBookmarkScreen.editOption).toBeVisible();

        // # Tap Edit
        await ChannelBookmarkScreen.editOption.tap();

        // * Verify edit modal opens
        await ChannelBookmarkScreen.toBeVisible();

        // Scope to channel_bookmark.screen; use toExist() — dual-list + iOS modal overlays.
        await waitFor(
            element(
                by.id('bookmark-generic-icon').
                    withAncestor(by.id('channel_bookmark.screen')),
            ),
        ).toExist().withTimeout(timeouts.TEN_SEC);

        // # Close the edit modal without making changes
        await ChannelBookmarkScreen.close();

        // # Go back to channel list
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T5609_1 - should display bookmark bar below channel header', async () => {
        // # Navigate to the channel
        await openChannel(channelT5609);

        // Scope to channel_header.bookmarks.list — same title also in channel_info when modal is open.
        await expect(
            element(
                by.text('Banner Test Bookmark').
                    withAncestor(by.id('channel_header.bookmarks.list')),
            ),
        ).toBeVisible();

        // # Go back to channel list
        await ChannelScreen.back();
    });

    it('MM-T69455_1 - should open file preview on tap and options sheet on long press for channel bookmarks', async () => {
        const channelT69455 = await createChannel();

        const {bookmark: linkT69455, error: linkError} = await ChannelBookmark.apiCreateChannelBookmarkLink(
            siteOneUrl, channelT69455.id, 'Tap Link Bookmark', 'https://mattermost.com',
        );
        if (linkError || !linkT69455?.id) {
            throw new Error(`[MM-T69455_1] Failed to create bookmarkLinkT69455: ${JSON.stringify(linkError)}`);
        }

        const {fileId, error: uploadError} = await Post.apiUploadFileToChannel(
            siteOneUrl,
            channelT69455.id,
            path.resolve(__dirname, '../../../../support/fixtures/image.png'),
            {forBookmark: true},
        );
        if (uploadError || !fileId) {
            throw new Error(`[MM-T69455_1] Failed to upload file bookmark attachment: ${JSON.stringify(uploadError)}`);
        }
        const {bookmark: bookmarkFileT69455, error: fileBookmarkError} = await ChannelBookmark.apiCreateChannelBookmarkFile(
            siteOneUrl, channelT69455.id, 'Tap File Bookmark', fileId,
        );
        if (fileBookmarkError || !bookmarkFileT69455?.id) {
            throw new Error(`[MM-T69455_1] Failed to create bookmarkFileT69455: ${JSON.stringify(fileBookmarkError)}`);
        }

        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();

        const getHeaderBookmark = (bookmarkId: string) => element(
            by.
                id(`channel_bookmark.${bookmarkId}`).
                withAncestor(by.id('channel_header.bookmarks.list')),
        );

        const dismissGallery = async () => {
            if (isAndroid()) {
                await device.pressBack();
            } else {
                await element(by.id('gallery.header.close.button')).atIndex(0).tap();
            }
            await waitFor(element(by.id('gallery.header.close.button'))).not.toExist().withTimeout(timeouts.TEN_SEC);
        };

        // # Navigate to the channel with link and file bookmarks
        await openChannel(channelT69455);

        const fileBookmarkEl = getHeaderBookmark(bookmarkFileT69455.id);
        const linkBookmarkEl = getHeaderBookmark(linkT69455.id);

        await waitFor(fileBookmarkEl).toExist().withTimeout(timeouts.TEN_SEC);
        await waitFor(linkBookmarkEl).toExist().withTimeout(timeouts.TEN_SEC);

        // # Tap the file bookmark
        await fileBookmarkEl.tap();

        // * Verify file preview gallery opens (tap must reach the gallery press handler)
        const galleryCloseButton = element(by.id('gallery.header.close.button'));
        await waitFor(galleryCloseButton).toExist().withTimeout(timeouts.TEN_SEC);

        // # Dismiss the gallery
        await dismissGallery();

        // # Tap the link bookmark
        await linkBookmarkEl.tap();
        await wait(timeouts.ONE_SEC);

        // * Verify tap does not open the bookmark options bottom sheet
        await expect(ChannelBookmarkScreen.editOption).not.toBeVisible();

        // # Long press the link bookmark to open options
        await linkBookmarkEl.longPress();

        // * Verify long press opens the bookmark options bottom sheet
        await expect(ChannelBookmarkScreen.editOption).toBeVisible();

        if (isAndroid()) {
            await device.pressBack();
        }

        // # Go back to channel list
        await ChannelScreen.back();
    });
});
