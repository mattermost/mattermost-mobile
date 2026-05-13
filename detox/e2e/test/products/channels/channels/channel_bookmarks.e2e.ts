// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    ChannelBookmark,
    Channel,
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
import {isAndroid, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Channels - Channel Bookmarks', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testTeam: any;
    let testUser: any;
    let bookmarksAvailable = false;

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
    let channelT5611: any;
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

    const createChannel = async () => {
        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {
            type: 'O',
            teamId: testTeam.id,
        });
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, channel.id);
        return channel;
    };

    // With many channels in the sidebar the list is taller than the viewport and some
    // channels are scrolled off-screen. Wait for the FlashList to be rendered first
    // (it appears slightly after channel_list.screen after a fresh login), then reset
    // to the top so channels above the current viewport are reachable when scrolling down.
    const openChannel = async (channel: any) => {
        const displayNameEl = ChannelListScreen.getChannelItemDisplayName(channelsCategory, channel.name);
        await waitFor(element(by.id('channel_list.flat_list'))).
            toExist().
            withTimeout(timeouts.TEN_SEC);
        await element(by.id('channel_list.flat_list')).scrollTo('top');
        await waitFor(displayNameEl).
            toBeVisible().
            whileElement(by.id('channel_list.flat_list')).
            scroll(100, 'down');
        await displayNameEl.tap();
        await ChannelScreen.dismissScheduledPostTooltip();
        return ChannelScreen.toBeVisible();
    };

    beforeAll(async () => {
        const {team, user} = await Setup.apiInit(siteOneUrl);
        testTeam = team;
        testUser = user;

        // ── Check if bookmarks API is available on this server ────────────────
        const probeChannel = await createChannel();
        const isAvailable = await ChannelBookmark.apiIsBookmarksAvailable(siteOneUrl, probeChannel.id);
        if (!isAvailable) {
            // eslint-disable-next-line no-console
            console.warn('Channel bookmarks API not available on this server — skipping suite');
            return;
        }
        bookmarksAvailable = true;

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
        channelT5611 = await createChannel();
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
        await ChannelBookmark.apiCreateChannelBookmarkLink(
            siteOneUrl, channelT5606.id, 'Emoji Icon Test', 'https://example.com',
        );
        await ChannelBookmark.apiCreateChannelBookmarkLink(
            siteOneUrl, channelT5607.id, 'Revert Emoji Test', 'https://example.com',
        );
        await ChannelBookmark.apiCreateChannelBookmarkLink(
            siteOneUrl, channelT5609.id, 'Banner Test Bookmark', 'https://mattermost.com',
        );
        await ChannelBookmark.apiCreateChannelBookmarkLink(
            siteOneUrl, channelT5611.id, 'External Link Bookmark', 'https://mattermost.com',
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
        if (!bookmarksAvailable) {
            return;
        }
        await ChannelListScreen.toBeVisible();
    });

    afterEach(async () => {
        if (!bookmarksAvailable) {
            return;
        }

        // # Safety net: return to channel list if a test left the app on a channel or modal screen.
        // On Android the tab bar can be hidden behind modals (emoji picker, edit modal, channel info).
        // Press Back up to 4 times — but only if the channel list is NOT already visible — to avoid
        // accidentally navigating past the channel list (pressing Back there minimizes the app).
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
        if (!bookmarksAvailable) {
            return;
        }
        await HomeScreen.logout();
    });

    it('MM-T5600_1 - should show Add bookmark option in channel info on licensed server', async () => {
        if (!bookmarksAvailable) {
            return;
        }

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
        if (!bookmarksAvailable) {
            return;
        }

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
        if (!bookmarksAvailable) {
            return;
        }

        // # Navigate to the channel
        await openChannel(channelT5602);

        // # Open channel info and tap "Add a bookmark"
        await ChannelInfoScreen.open();
        await element(by.text('Add a bookmark')).tap();

        // * Verify bottom sheet / add bookmark options appears
        await expect(ChannelBookmarkScreen.addALinkOption).toBeVisible();

        // # Tap "Add a link"
        await ChannelBookmarkScreen.addALinkOption.tap();

        // * Verify the Add a bookmark modal opens
        await ChannelBookmarkScreen.toBeVisible();

        // # Enter a valid URL and submit
        const linkInput = ChannelBookmarkScreen.getLinkInput();
        let bookmarkTitle = '';
        await ChannelBookmarkScreen.runUnsynchronized(async () => {
            await linkInput.tap();
            await linkInput.typeText('https://mattermost.com');
            bookmarkTitle =
                await ChannelBookmarkScreen.waitForAutofilledTitle('Mattermost');
            await waitFor(ChannelBookmarkScreen.saveButton).
                toBeVisible().
                withTimeout(timeouts.TEN_SEC);
            await ChannelBookmarkScreen.saveButton.tap();
        });
        await wait(timeouts.TWO_SEC);

        // * Verify the bookmark modal closed and the bookmark is visible in channel info
        await expect(ChannelBookmarkScreen.channelBookmarkScreen).not.toExist();
        await waitFor(element(by.text(bookmarkTitle)).atIndex(0)).
            toExist().
            withTimeout(timeouts.TEN_SEC);

        // # Close channel info and go back to channel list
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T5608_1 - should show error when adding a bookmark with an invalid URL', async () => {
        if (!bookmarksAvailable) {
            return;
        }

        // # Navigate to the channel
        await openChannel(channelT5608);

        // # Open channel info and tap "Add a bookmark"
        await ChannelInfoScreen.open();
        await element(by.text('Add a bookmark')).tap();

        // * Verify bottom sheet options appear
        await expect(ChannelBookmarkScreen.addALinkOption).toBeVisible();

        // # Tap "Add a link"
        await ChannelBookmarkScreen.addALinkOption.tap();

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
        if (!bookmarksAvailable) {
            return;
        }

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

        // * Verify the updated bookmark title is shown in channel info.
        // Use by.text + withAncestor to both verify the title text updated AND
        // avoid matching the same text in channel_header.bookmarks.list (the channel
        // screen stays mounted behind channel_info in RNN). Use toExist() instead of
        // toBeVisible() because iOS UITransitionView layers from modal animations can
        // temporarily block the 75% visibility threshold even when the element is present.
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
        if (!bookmarksAvailable) {
            return;
        }

        // # Navigate to the channel
        await openChannel(channelT5604);

        // # Open channel info and tap "Add a bookmark"
        await ChannelInfoScreen.open();
        await element(by.text('Add a bookmark')).tap();

        // # Tap "Add a link"
        await ChannelBookmarkScreen.addALinkOption.tap();

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
        if (!bookmarksAvailable) {
            return;
        }

        // # Navigate to the channel
        await openChannel(channelT5605);

        // # Open channel info to see the bookmark
        await ChannelInfoScreen.open();

        // * Verify the bookmark is visible in channel_info.
        // Scope to channel_info.bookmarks.list — the same text also appears in
        // channel_header.bookmarks.list (mounted behind the modal) and iOS picks
        // that (not-visible) element first in the accessibility hierarchy.
        await expect(
            element(
                by.text('No Favicon Bookmark').
                    withAncestor(by.id('channel_info.bookmarks.list')),
            ),
        ).toBeVisible();

        // * Verify the generic fallback icon is shown (no image/emoji icon found).
        // Same dual-list ambiguity — scope to channel_info.
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

    it('MM-T5606_1 - should be able to change the icon/emoji of a bookmark', async () => {
        if (!bookmarksAvailable) {
            return;
        }

        // # Navigate to the channel
        await openChannel(channelT5606);

        // # Open channel info to see the bookmark
        await ChannelInfoScreen.open();

        // * Verify the bookmark is visible
        const bookmarkTitle = await getVisibleTextElement('Emoji Icon Test');

        // # Long press on the bookmark to open options
        await bookmarkTitle.longPress();

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
        // On Android, pending OG-fetch network requests and bottom-sheet animations keep the
        // Detox AnimatedModuleIdlingResource busy throughout this entire flow. Disable sync
        // for the icon tap AND the emoji search/select to avoid timeout failures.
        if (isAndroid()) {
            await device.disableSynchronization();
        }
        await element(
            by.id('bookmark-generic-icon').
                withAncestor(by.id('channel_bookmark.screen')),
        ).tap();

        // * Verify the emoji picker opens
        await EmojiPickerScreen.toBeVisible();

        // # Dismiss the skin-tone tooltip if it appears (Android shows it on first open)
        try {
            await waitFor(EmojiPickerScreen.toolTipCloseButton).
                toBeVisible().
                withTimeout(timeouts.TWO_SEC);
            await EmojiPickerScreen.toolTipCloseButton.tap();
        } catch {
            // Tooltip did not appear — continue normally
        }

        // # Search and select a specific emoji.
        // Wait for the bottom sheet to fully finish animating in (effective visibility = VISIBLE)
        // before interacting — replaceText on Android requires all ancestor alpha values to be 1.
        // An extra ONE_SEC settle ensures the sheet is fully opaque in the full test suite where
        // concurrent background animations slow the final alpha transition.
        await waitFor(EmojiPickerScreen.searchInput).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await wait(timeouts.ONE_SEC);
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
        if (!bookmarksAvailable) {
            return;
        }

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

        // * Verify that the generic fallback icon is shown (no emoji set yet).
        // Scope to channel_bookmark.screen — bookmark-generic-icon also exists in
        // channel_header and channel_info behind the edit modal. Use toExist() since
        // UITransitionView layers can interfere with the 75% visibility threshold.
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
        if (!bookmarksAvailable) {
            return;
        }

        // # Navigate to the channel
        await openChannel(channelT5609);

        // * Verify that the bookmark bar is visible below the channel header
        await expect(element(by.text('Banner Test Bookmark'))).toBeVisible();

        // # Go back to channel list
        await ChannelScreen.back();
    });

    it('MM-T5611_1 - should open a bookmark URL in external browser', async () => {
        if (!bookmarksAvailable) {
            return;
        }

        // # Navigate to the channel
        await openChannel(channelT5611);

        // * Verify the bookmark is visible in the channel bookmark bar
        await expect(element(by.text('External Link Bookmark'))).toBeVisible();

        // # Tap the bookmark to open the link.
        // On Android, Reanimated animations in the bookmark bar keep the
        // AnimatedModuleIdlingResource busy; disable sync to allow the tap.
        // On iOS the link opens in the system Safari browser, backgrounding Mattermost.
        // Bring the app back to foreground before asserting/navigating.
        if (isAndroid()) {
            await device.disableSynchronization();
        }
        await element(by.text('External Link Bookmark')).tap();
        await wait(timeouts.TWO_SEC);
        if (isAndroid()) {
            await device.enableSynchronization();
        }
        await device.launchApp({newInstance: false});
        await wait(timeouts.ONE_SEC);

        // * Verify the channel screen and bookmark bar are still present after returning
        await expect(element(by.text('External Link Bookmark'))).toBeVisible();

        // # Go back to channel list
        await ChannelScreen.back();
    });

    it('MM-T5612_1 - should show scroll indicator when bookmarks exceed visible limit', async () => {
        if (!bookmarksAvailable) {
            return;
        }
        const channelHeaderBookmarksList = by.id('channel_header.bookmarks.list');
        const firstBookmarkMatcher = by.text('Scroll Bookmark 1');
        const lastBookmarkMatcher = by.text('Scroll Bookmark 12');

        // # Navigate to the channel (12 bookmarks pre-created in beforeAll)
        await openChannel(channelT5612);

        // * Verify that the first bookmark is visible
        await expect(element(firstBookmarkMatcher)).toBeVisible();

        // * Verify that the last bookmark starts off-screen
        await expect(element(lastBookmarkMatcher)).not.toBeVisible();

        // # Scroll the bookmark bar by swiping left to reveal the last bookmark.
        // Detox's scroll() action on a horizontal FlatList fails on iOS because EarlGrey
        // requires the start point to be directly on a UIScrollView, but all coordinates
        // are occupied by bookmark item child views. swipe() performs a raw gesture
        // without that constraint and correctly scrolls the FlatList.
        // With 12 bookmarks (~150pt each) on a ~393pt screen, ~5 fast swipes are needed.
        /* eslint-disable no-await-in-loop */
        for (let i = 0; i < 5; i++) {
            await element(channelHeaderBookmarksList).swipe('left', 'fast', 0.9, 0.5, 0.5);
        }
        /* eslint-enable no-await-in-loop */

        // * Verify the last bookmark becomes visible after scrolling to the end
        await waitFor(element(lastBookmarkMatcher)).
            toBeVisible().
            withTimeout(timeouts.TEN_SEC);

        // # Swipe back right to the beginning
        /* eslint-disable no-await-in-loop */
        for (let i = 0; i < 5; i++) {
            await element(channelHeaderBookmarksList).swipe('right', 'fast', 0.9, 0.5, 0.5);
        }
        /* eslint-enable no-await-in-loop */

        // # Go back to channel list
        await ChannelScreen.back();
    });
});
