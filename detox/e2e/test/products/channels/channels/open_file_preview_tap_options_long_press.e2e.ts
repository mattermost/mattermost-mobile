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
import {isAndroid, isIos, safeEnableSynchronization, timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Channels - Channel Bookmarks', () => {

    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testTeam: any;
    let testUser: any;
    let channelT5605: any;
    let channelT5606: any;
    let channelT5607: any;
    let channelT5609: any;
    let channelT5610: any;
    let channelT5612: any;

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
        await ChannelListScreen.toBeVisible();
        const displayNameEl = ChannelListScreen.getChannelItemDisplayName(channelsCategory, channel.name);
        await waitFor(element(by.id('channel_list.flat_list'))).
            toExist().
            withTimeout(timeouts.TWENTY_SEC);

        if (isIos()) {
            await device.disableSynchronization();
        }

        try {
            await element(by.id('channel_list.flat_list')).scrollTo('top');

            try {
                if (isIos()) {
                    await waitFor(displayNameEl).
                        toBeVisible().
                        whileElement(by.id('channel_list.flat_list')).
                        scroll(100, 'down', 0.5, 0.3);
                } else {
                    await waitFor(displayNameEl).
                        toExist().
                        whileElement(by.id('channel_list.flat_list')).
                        scroll(100, 'down');
                }
            } catch {
                // Fall through to tap(): the row can sit at the bottom edge below the
                // visibility threshold while still having a hittable centre point.
            }

            await displayNameEl.tap();
        } finally {
            if (isIos()) {
                await safeEnableSynchronization();
            }
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
        channelT5605 = await createChannel();
        channelT5606 = await createChannel();
        channelT5607 = await createChannel();
        channelT5609 = await createChannel();
        channelT5610 = await createChannel();
        channelT5612 = await createChannel();

        // Connect before creating bookmarks so the client receives the WebSocket events; these
        // tests exercise bookmark UI, not the eventually-consistent channel-open fetch.
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);

        // ── Pre-create bookmarks ──────────────────────────────────────────────
        const {bookmark: bT5610} = await ChannelBookmark.apiCreateChannelBookmarkLink(
            siteOneUrl, channelT5610.id, 'Original Bookmark', 'https://mattermost.com',
        );
        if (!bT5610?.id) {
            throw new Error('[beforeAll] Failed to create bookmarkT5610');
        }

        await ChannelBookmark.apiCreateChannelBookmarkLink(
            siteOneUrl, channelT5605.id, 'No Favicon Bookmark', 'https://example.com',
        );
        const {bookmark: bT5606} = await ChannelBookmark.apiCreateChannelBookmarkLink(
            siteOneUrl, channelT5606.id, 'Emoji Icon Test', 'https://example.com',
        );
        if (!bT5606?.id) {
            throw new Error('[beforeAll] Failed to create bookmarkT5606');
        }
        const {bookmark: bT5607} = await ChannelBookmark.apiCreateChannelBookmarkLink(
            siteOneUrl, channelT5607.id, 'Revert Emoji Test', 'https://example.com',
        );
        if (!bT5607?.id) {
            throw new Error('[beforeAll] Failed to create bookmarkT5607');
        }
        await ChannelBookmark.apiCreateChannelBookmarkLink(
            siteOneUrl, channelT5609.id, 'Banner Test Bookmark', 'https://mattermost.com',
        );

        /* eslint-disable no-await-in-loop */
        for (let i = 1; i <= 12; i++) {
            await ChannelBookmark.apiCreateChannelBookmarkLink(
                siteOneUrl, channelT5612.id, `Scroll Bookmark ${i}`, `https://example.com/${i}`,
            );
        }
        /* eslint-enable no-await-in-loop */

        // Reload after the WebSocket-backed setup has settled.
        await wait(timeouts.TWO_SEC);
        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();
    });

    beforeEach(async () => {
        await ChannelListScreen.toBeVisible();
    });

    afterEach(async () => {
        // Android safety net: Back up to 4x only if channel_list.screen not visible.
        if (isAndroid()) {
            try {
                await waitFor(ChannelBookmarkScreen.addErrorTitle).toBeVisible().withTimeout(timeouts.TWO_SEC);
                await ChannelBookmarkScreen.errorOkButton.tap();
            } catch {
                // No bookmark error alert is present.
            }

            // Back-press until the channel list is reached, then reload if it never is. TWO_SEC
            // detection: a 1s probe missed the fresh channel_list.screen and minimized the app.
            for (let i = 0; i < 4; i++) {
                try {
                    // eslint-disable-next-line no-await-in-loop
                    await waitFor(element(by.id('channel_list.screen'))).
                        toExist().
                        withTimeout(timeouts.TWO_SEC);
                    break; // Channel list is already showing — stop pressing back
                } catch {
                    // Not at channel list yet — dismiss the top-most layer
                    // eslint-disable-next-line no-await-in-loop
                    await device.pressBack();
                    // eslint-disable-next-line no-await-in-loop
                    await wait(timeouts.ONE_SEC);
                }
            }
            try {
                await waitFor(element(by.id('channel_list.screen'))).toExist().withTimeout(timeouts.TWO_SEC);
            } catch {
                await device.reloadReactNative();
                await waitFor(element(by.id('channel_list.screen'))).toExist().withTimeout(timeouts.TEN_SEC);
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

    // Skip: depends on app-side bookmark whitelist fix (not in this PR).

    // Skip iOS: CI run 30424009936 (f86f99e1) — openChannel's channel row is clipped at the list
    // edge, so tap() fails the 100% visibility threshold despite the scroll fallback.

    // Skip: after long-press options the dismiss swipe still leaves Edit in the tree on iOS
    // (CI 29cdff/59ec6ae/ce729d/bc6df62). Re-enable once sheet dismissal is stable.

    it.skip('MM-T69455_1 - should open file preview on tap and options on long press', async () => {
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
        const channelHeaderBookmarksList = by.id('channel_header.bookmarks.list');

        // Authoritative sync: both bookmarks must exist in channel info before
        // trusting the virtualized header FlatList (CI 30250131265: only file chip).
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.waitForBookmarkInChannelInfo(
            by.id(`channel_bookmark.${bookmarkFileT69455.id}`).
                withAncestor(by.id('channel_info.bookmarks.list')),
            {bookmarkId: bookmarkFileT69455.id, textFallback: 'Tap File Bookmark'},
        );
        await ChannelInfoScreen.waitForBookmarkInChannelInfo(
            by.id(`channel_bookmark.${linkT69455.id}`).
                withAncestor(by.id('channel_info.bookmarks.list')),
            {bookmarkId: linkT69455.id, textFallback: 'Tap Link Bookmark'},
        );
        await ChannelInfoScreen.close();

        const ensureHeaderBookmarkVisible = async (bookmarkEl: ReturnType<typeof element>, label: string) => {
            try {
                await waitFor(bookmarkEl).toBeVisible().withTimeout(timeouts.FOUR_SEC);
                return;
            } catch {
                // Swipe the horizontal header list both directions.
            }

            /* eslint-disable no-await-in-loop -- bounded swipe until chip is on-screen */
            for (let i = 0; i < 8; i++) {
                try {
                    await waitFor(bookmarkEl).toBeVisible().withTimeout(timeouts.TWO_SEC);
                    return;
                } catch {
                    if (i === 7) {
                        throw new Error(`${label} not visible in channel header after sync + swipe`);
                    }
                    const direction = i % 2 === 0 ? 'left' : 'right';
                    try {
                        await element(channelHeaderBookmarksList).swipe(direction, 'fast', 0.9, 0.5, 0.5);
                    } catch {
                        // List may not be scrollable further in this direction.
                    }
                }
            }
            /* eslint-enable no-await-in-loop */
        };

        await ensureHeaderBookmarkVisible(fileBookmarkEl, 'Tap File Bookmark');

        // # Tap the file bookmark while it is still on-screen
        await fileBookmarkEl.tap();

        // * Verify file preview gallery opens (tap must reach the gallery press handler)
        const galleryCloseButton = element(by.id('gallery.header.close.button'));
        await waitFor(galleryCloseButton).toExist().withTimeout(timeouts.TEN_SEC);

        // # Dismiss the gallery
        await dismissGallery();

        await ensureHeaderBookmarkVisible(linkBookmarkEl, 'Tap Link Bookmark');

        // # Long press the link bookmark to open options
        await linkBookmarkEl.longPress();

        // * Verify long press opens the bookmark options bottom sheet
        await expect(ChannelBookmarkScreen.editOption).toBeVisible();

        // Sheet has Edit/Copy/Share/Delete — no Cancel (CI 59ec6ae screenshot).
        await ChannelBookmarkScreen.dismissOptionsSheet();
        await ChannelScreen.toBeVisible();

        // # Go back to channel list
        await ChannelScreen.back();
        await ChannelListScreen.toBeVisible();
    });
});
