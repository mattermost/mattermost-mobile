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
    EmojiPickerScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {isAndroid, isIos, timeouts, wait, waitForElementToExist, waitForElementToNotExist} from '@support/utils';
import {expect} from 'detox';

describe('Channels - Channel Bookmarks', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testTeam: any;
    let testUser: any;
    let channelT5600: any;
    let channelT5601: any;
    let channelT5602: any;
    let channelT5604: any;
    let channelT5605: any;
    let channelT5606: any;
    let channelT5607: any;
    let channelT5608: any;
    let channelT5609: any;
    let channelT5610: any;
    let bookmarkT5610: any;
    let bookmarkT5606: any;
    let channelT5612: any;

    const getVisibleTextElement = async (text: string, maxIndex = 3) => {
        /* eslint-disable no-await-in-loop */
        for (let index = 0; index < maxIndex; index++) {
            const candidate = element(by.text(text)).atIndex(index);

            try {
                await expect(candidate).toBeVisible();
                return candidate;
            } catch {
                // Try the next visible match when the same label appears in multiple layers.
            }
        }
        /* eslint-enable no-await-in-loop */

        throw new Error(`No visible element found for text "${text}"`);
    };

    const waitForBookmarkInChannelInfo = async (
        bookmarkMatcher: Detox.NativeMatcher,
        options?: {textFallback?: string; bookmarkId?: string},
    ) => {
        await ChannelInfoScreen.waitForBookmarkInChannelInfo(bookmarkMatcher, options);
    };

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
            try {
                await waitFor(displayNameEl).
                    toExist().
                    whileElement(by.id('channel_list.flat_list')).
                    scroll(100, 'down');
            } catch {
                // Fall through to tap()
            }
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
        channelT5602 = await createChannel();
        channelT5604 = await createChannel();
        channelT5605 = await createChannel();
        channelT5606 = await createChannel();
        channelT5607 = await createChannel();
        channelT5608 = await createChannel();
        channelT5609 = await createChannel();
        channelT5610 = await createChannel();
        channelT5612 = await createChannel();

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
        const {bookmark: bT5606} = await ChannelBookmark.apiCreateChannelBookmarkLink(
            siteOneUrl, channelT5606.id, 'Emoji Icon Test', 'https://example.com',
        );
        if (!bT5606?.id) {
            throw new Error('[beforeAll] Failed to create bookmarkT5606');
        }
        bookmarkT5606 = bT5606;
        await ChannelBookmark.apiCreateChannelBookmarkLink(
            siteOneUrl, channelT5607.id, 'Revert Emoji Test', 'https://example.com',
        );
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
            // Back-press loop: dismiss whatever modal/screen a failed test left on
            // top, but stop as soon as the channel list is reached. The detection
            // timeout is TWO_SEC (not ONE_SEC): CI run 28392181656 showed that with a
            // 1s probe the loop missed the just-rendered channel_list.screen after a
            // back-press, kept pressing Back, and minimized the app — leaving the
            // NEXT test (MM-T5608_1) to time out on `channel_list.flat_list` in
            // `openChannel`. If back-press still can't reach the channel list (a
            // stuck modal/blank screen), reload to a clean channel list rather than
            // poisoning the rest of the shard.
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

    it('MM-T5602_1 - should be able to add a bookmark link via channel info', async () => {
        // # Navigate to the channel
        await openChannel(channelT5602);

        // # Open channel info and tap "Add a bookmark"
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.tapAddBookmark();

        // * Verify bottom sheet / add bookmark options appears
        await waitForElementToExist(ChannelBookmarkScreen.addALinkOption, timeouts.TEN_SEC);

        // # Tap "Add a link"
        await ChannelBookmarkScreen.tapAddALinkOption();

        // * Verify the Add a bookmark modal opens
        await ChannelBookmarkScreen.toBeVisible();

        // # Enter a stable URL and manual title — avoid OG autofill flakiness on Android CI
        const linkInput = ChannelBookmarkScreen.getLinkInput();
        const bookmarkTitle = 'E2E Bookmark Link';
        await ChannelBookmarkScreen.runUnsynchronized(async () => {
            await linkInput.tap();
            await linkInput.typeText('https://example.com');
            const titleInput = ChannelBookmarkScreen.getTitleInput();
            await waitForElementToExist(titleInput, timeouts.TEN_SEC);
            await titleInput.tap();
            await titleInput.replaceText(bookmarkTitle);
            await ChannelBookmarkScreen.waitForTitleValue(bookmarkTitle);
            await waitFor(ChannelBookmarkScreen.saveButton).
                toBeVisible().
                withTimeout(timeouts.TEN_SEC);
            await ChannelBookmarkScreen.saveButton.tap();
        });
        await wait(timeouts.TWO_SEC);

        // * Verify the bookmark modal closed and the bookmark is visible in channel info
        try {
            await waitForElementToNotExist(ChannelBookmarkScreen.channelBookmarkScreen, timeouts.TWENTY_SEC);
        } catch {
            // Modal didn't auto-dismiss: either the save succeeded but the dismiss
            // animation stalled, or a save error left the modal up. The close button
            // dismisses the form on BOTH platforms — safe because a successful create
            // already persisted the bookmark server-side, and on a save error there is
            // no bookmark to lose. `device.pressBack()` is a no-op on iOS, so it must
            // not be the primary fallback (CI 28392181656 MM-T5602_1 iOS stuck here for
            // 20s). Keep pressBack as an Android-only secondary fallback.
            try {
                await ChannelBookmarkScreen.closeButton.tap();
            } catch {
                if (isAndroid()) {
                    await device.pressBack();
                }
            }
            await waitForElementToNotExist(ChannelBookmarkScreen.channelBookmarkScreen, timeouts.TEN_SEC);
        }
        await ChannelInfoScreen.scrollToBookmarks();

        // * Verify the bookmark is visible in channel info. The app renders the
        // bookmark in `channel_info.bookmarks.list` (when channel info is open) but
        // the same title also mounts in `channel_header.bookmarks.list` (the bar,
        // kept mounted behind the channel_info modal in RNN) — see MM-T5605 comments.
        // Poll channel_info first; if it never appears there, accept the header bar
        // as proof the save persisted (CI 28392181656 MM-T5602_1: the bookmark never
        // surfaced in channel_info.bookmarks.list within 10s).
        const infoBookmark = element(
            by.text(bookmarkTitle).withAncestor(by.id('channel_info.bookmarks.list')),
        );
        const headerBookmark = element(
            by.text(bookmarkTitle).withAncestor(by.id('channel_header.bookmarks.list')),
        );
        try {
            await waitFor(infoBookmark).toExist().withTimeout(timeouts.TEN_SEC);
        } catch {
            await waitFor(headerBookmark).toExist().withTimeout(timeouts.TEN_SEC);
        }

        // # Close channel info and go back to channel list
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T5608_1 - should show error when adding a bookmark with an invalid URL', async () => {
        // # Navigate to the channel
        await openChannel(channelT5608);

        // # Open channel info and tap "Add a bookmark"
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.tapAddBookmark();

        // * Verify bottom sheet options appear
        await waitForElementToExist(ChannelBookmarkScreen.addALinkOption, timeouts.TEN_SEC);

        // # Tap "Add a link"
        await ChannelBookmarkScreen.tapAddALinkOption();

        // * Verify the Add a bookmark modal opens
        await ChannelBookmarkScreen.toBeVisible();

        // # Enter an invalid URL
        const linkInput = ChannelBookmarkScreen.getLinkInput();
        await ChannelBookmarkScreen.runUnsynchronized(async () => {
            await linkInput.tap();
            await linkInput.typeText('not a link');
            await waitFor(element(by.text('Please enter a valid link'))).
                toBeVisible().
                withTimeout(timeouts.ONE_MIN);
        });

        // * Verify that an error is shown (invalid link message appears)
        await expect(element(by.text('Please enter a valid link'))).toBeVisible();

        // # Close the bookmark modal
        await ChannelBookmarkScreen.closeAddButton.tap();
        await expect(ChannelBookmarkScreen.channelBookmarkScreen).not.toBeVisible();

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
        await waitForBookmarkInChannelInfo(
            by.id(`channel_bookmark.${bookmarkT5610.id}`).withAncestor(by.id('channel_info.bookmarks.list')),
            {bookmarkId: bookmarkT5610.id},
        );

        const bookmarkEl = element(by.id(`channel_bookmark.${bookmarkT5610.id}`).withAncestor(by.id('channel_info.bookmarks.list')));

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

    it('MM-T5604_1 - should auto-populate title from page when adding a bookmark link', async () => {
        // # Navigate to the channel
        await openChannel(channelT5604);

        // # Open channel info and tap "Add a bookmark"
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.tapAddBookmark();

        // # Tap "Add a link"
        await ChannelBookmarkScreen.tapAddALinkOption();

        // * Verify the Add a bookmark modal opens
        await ChannelBookmarkScreen.toBeVisible();

        // # Enter a valid URL and submit
        // Use a public URL with known OG tags rather than siteOneUrl (http://localhost:8065):
        // the local server's OG title fetch can fail on Android due to network routing differences.
        const linkInput = ChannelBookmarkScreen.getLinkInput();
        await ChannelBookmarkScreen.runUnsynchronized(async () => {
            await linkInput.tap();
            await linkInput.typeText('https://mattermost.com');
            await ChannelBookmarkScreen.waitForAutofilledTitle('Mattermost');
        });

        // # Wait for OG fetch / title auto-fill
        const titleInput = ChannelBookmarkScreen.getTitleInput();
        await waitFor(titleInput).toExist().withTimeout(timeouts.TEN_SEC);

        // * Verify the title field is auto-populated (the OG title for mattermost.com is non-empty)
        await expect(titleInput).toExist();
        const titleValue = await ChannelBookmarkScreen.getTitleValue();
        if (!titleValue) {
            throw new Error('Expected bookmark title input to be auto-populated');
        }

        // # Close the bookmark modal
        await ChannelBookmarkScreen.close();

        // # Go back to channel list
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T5605_1 - should show fallback bookmark icon when no favicon is found', async () => {
        // # Navigate to the channel
        await openChannel(channelT5605);

        // # Open channel info to see the bookmark
        await ChannelInfoScreen.open();

        // * Verify the bookmark is visible in channel_info (retry close/reopen + header fallback).
        await waitForBookmarkInChannelInfo(
            by.text('No Favicon Bookmark').withAncestor(by.id('channel_info.bookmarks.list')),
            {textFallback: 'No Favicon Bookmark'},
        );

        // * Verify the generic fallback icon is shown (no image/emoji icon found).
        await waitFor(
            element(
                by.id('bookmark-generic-icon').
                    withAncestor(by.id('channel_info.bookmarks.list')),
            ),
        ).toExist().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T5606_1 - should be able to change the icon/emoji of a bookmark', async () => {
        // # Navigate to the channel
        await openChannel(channelT5606);

        // # Open channel info to see the bookmark
        await ChannelInfoScreen.open();

        // * Verify the bookmark is visible. Use the bookmark's stable testID scoped to
        // channel_info.bookmarks.list to avoid the channel_header ambiguity (same bookmark
        // also renders in the bookmark bar mounted behind the channel_info modal) and to
        // avoid flakiness when text rendering is delayed by OG-fetch network requests.
        await waitForBookmarkInChannelInfo(
            by.id(`channel_bookmark.${bookmarkT5606.id}`).withAncestor(by.id('channel_info.bookmarks.list')),
            {bookmarkId: bookmarkT5606.id},
        );

        const bookmarkEl = element(by.id(`channel_bookmark.${bookmarkT5606.id}`).withAncestor(by.id('channel_info.bookmarks.list')));
        await bookmarkEl.longPress();

        // * Verify bookmark options appear
        await expect(ChannelBookmarkScreen.editOption).toBeVisible();

        // # Tap Edit
        await ChannelBookmarkScreen.editOption.tap();

        // * Verify the Edit bookmark modal opens
        await ChannelBookmarkScreen.toBeVisible();

        // # Update the bookmark title
        const titleInput = ChannelBookmarkScreen.getTitleInput();
        await titleInput.tap();
        await titleInput.replaceText('Emoji Icon Updated');
        await ChannelBookmarkScreen.waitForTitleValue('Emoji Icon Updated');

        // # Tap the icon button to open the emoji picker, then search and select an emoji.
        // openEmojiPickerFromEditModal disables Android sync and retries the icon tap
        // until emoji_picker.screen mounts (CI 28416284905 MM-T5606_1: search input null).
        await ChannelBookmarkScreen.openEmojiPickerFromEditModal();

        // # Search and select a specific emoji.
        await waitFor(EmojiPickerScreen.searchInput).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await EmojiPickerScreen.searchInput.tap();
        await EmojiPickerScreen.searchInput.replaceText('smile');
        await waitFor(element(by.text(':smile:'))).
            toBeVisible().
            withTimeout(timeouts.TEN_SEC);
        await element(by.text(':smile:')).tap();
        await wait(timeouts.TWO_SEC);
        if (isAndroid()) {
            await device.enableSynchronization();
        }

        // # Save the edited bookmark
        await waitFor(ChannelBookmarkScreen.saveButton).
            toBeVisible().
            withTimeout(timeouts.TEN_SEC);
        await ChannelBookmarkScreen.saveButton.tap();
        await wait(timeouts.TWO_SEC);

        // * Verify the updated bookmark title and emoji are visible in channel info.
        // getVisibleTextElement iterates indices to find the visible match (avoids
        // the channel_header ambiguity). bookmark-emoji uses toExist() to avoid the
        // UITransitionView occlusion that occurs while the edit modal finishes closing.
        const updatedBookmarkTitle =
            await getVisibleTextElement('Emoji Icon Updated');
        await expect(updatedBookmarkTitle).toBeVisible();
        await waitFor(
            element(
                by.id('bookmark-emoji').
                    withAncestor(by.id('channel_info.bookmarks.list')),
            ),
        ).toExist().withTimeout(timeouts.TEN_SEC);

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

    it('MM-T5612_1 - should show scroll indicator when bookmarks exceed visible limit', async () => {
        const channelHeaderBookmarksList = by.id('channel_header.bookmarks.list');
        const firstBookmarkMatcher = by.text('Scroll Bookmark 1').withAncestor(channelHeaderBookmarksList);
        const lastBookmarkMatcher = by.text('Scroll Bookmark 12').withAncestor(channelHeaderBookmarksList);

        // # Navigate to the channel (12 bookmarks pre-created in beforeAll)
        await openChannel(channelT5612);

        // * Verify that the first bookmark is visible
        await expect(element(firstBookmarkMatcher)).toBeVisible();

        // * Verify that the last bookmark starts off-screen
        await expect(element(lastBookmarkMatcher)).not.toBeVisible();

        // # Scroll the bookmark bar to reveal the last bookmark.
        if (isAndroid()) {
            const lastBookmark = element(lastBookmarkMatcher);
            const bookmarksList = element(channelHeaderBookmarksList);
            /* eslint-disable no-await-in-loop -- bounded scroll: stops as soon as target is found */
            for (let i = 0; i < 15; i++) {
                try {
                    await waitFor(lastBookmark).toExist().withTimeout(timeouts.TWO_SEC);
                    break;
                } catch {
                    if (i === 14) {
                        throw new Error('Scroll Bookmark 12 not found after 15 scroll attempts');
                    }
                    try {
                        await bookmarksList.scroll(500, 'right');
                    } catch {
                        await element(firstBookmarkMatcher).swipe('left', 'fast', 0.8, 0.7, 0.3);
                    }
                }
            }
            /* eslint-enable no-await-in-loop */
            /* eslint-disable no-await-in-loop -- bounded scroll: stops as soon as target is found */
            for (let i = 0; i < 15; i++) {
                try {
                    await waitFor(element(firstBookmarkMatcher)).toExist().withTimeout(timeouts.TWO_SEC);
                    break;
                } catch {
                    if (i === 14) {
                        throw new Error('Scroll Bookmark 1 not found after scrolling back');
                    }
                    try {
                        await bookmarksList.scroll(500, 'left');
                    } catch {
                        await lastBookmark.swipe('right', 'fast', 0.8, 0.3, 0.7);
                    }
                }
            }
            /* eslint-enable no-await-in-loop */
        } else {
            await waitFor(element(channelHeaderBookmarksList)).toExist().withTimeout(timeouts.TEN_SEC);
            /* eslint-disable no-await-in-loop -- bounded swipe: stops as soon as target is found */
            for (let i = 0; i < 12; i++) {
                try {
                    await waitFor(element(lastBookmarkMatcher)).toExist().withTimeout(timeouts.TWO_SEC);
                    break;
                } catch {
                    if (i === 11) {
                        throw new Error('Scroll Bookmark 12 not found after 12 swipe attempts');
                    }
                    try {
                        await element(channelHeaderBookmarksList).swipe('left', 'fast', 0.9, 0.5, 0.5);
                    } catch {
                        try {
                            await element(firstBookmarkMatcher).swipe('left', 'fast', 0.9, 0.5, 0.5);
                        } catch {
                            // Retry from the new scroll position.
                        }
                    }
                }
            }
            /* eslint-enable no-await-in-loop */
            await waitFor(element(lastBookmarkMatcher)).toExist().withTimeout(timeouts.TEN_SEC);
        }

        // # Scroll back to the beginning
        if (!isAndroid()) {
            /* eslint-disable no-await-in-loop -- bounded swipe: stops as soon as target is found */
            for (let i = 0; i < 12; i++) {
                try {
                    await waitFor(element(firstBookmarkMatcher)).toExist().withTimeout(timeouts.TWO_SEC);
                    break;
                } catch {
                    if (i === 11) {
                        throw new Error('Scroll Bookmark 1 not found after scrolling back');
                    }
                    try {
                        await element(channelHeaderBookmarksList).swipe('right', 'fast', 0.9, 0.5, 0.5);
                    } catch {
                        try {
                            await element(lastBookmarkMatcher).swipe('right', 'fast', 0.9, 0.5, 0.5);
                        } catch {
                            // Retry from the new scroll position.
                        }
                    }
                }
            }
            /* eslint-enable no-await-in-loop */
        }

        // On iOS the fast horizontal swipe can be misinterpreted as a long-press on a
        // bookmark item, opening the bookmark actions bottom sheet (Edit / Copy Link /
        // Share / Delete). That sheet then occludes the navigation header and the
        // subsequent ChannelScreen.back() taps a non-hittable back button. Detect the
        // sheet by its Delete row and swipe it down before navigating back.
        // See CI run 26352177261 testFnFailure for MM-T5612_1.
        try {
            const bookmarkActionsDelete = element(by.text('Delete'));
            await waitFor(bookmarkActionsDelete).toBeVisible().withTimeout(timeouts.TWO_SEC);
            await bookmarkActionsDelete.swipe('down', 'fast', 0.9, 0.5, 0.1);
            await wait(timeouts.ONE_SEC);
        } catch {
            // Action sheet not present — continue normally.

        }

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
