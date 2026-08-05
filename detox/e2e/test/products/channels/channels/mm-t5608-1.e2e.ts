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
import {isAndroid, isIos, safeEnableSynchronization, timeouts, wait, waitForElementToExist, waitForElementToNotExist} from '@support/utils';
import {expect, waitFor} from 'detox';

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
    let bookmarkT5606: any;
    let bookmarkT5607: any;
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
        bookmarkT5606 = bT5606;
        const {bookmark: bT5607} = await ChannelBookmark.apiCreateChannelBookmarkLink(
            siteOneUrl, channelT5607.id, 'Revert Emoji Test', 'https://example.com',
        );
        if (!bT5607?.id) {
            throw new Error('[beforeAll] Failed to create bookmarkT5607');
        }
        bookmarkT5607 = bT5607;
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
});
