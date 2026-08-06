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
import {isAndroid, isIos, safeEnableSynchronization, timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Channels - Channel Bookmarks', () => {

    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testTeam: any;
    let testUser: any;
    let channelT5606: any;
    let bookmarkT5606: any;

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
        if (!channel?.id) {
            throw new Error('[beforeAll] Failed to create channel');
        }
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

        channelT5606 = await createChannel();

        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);

        const {bookmark: b} = await ChannelBookmark.apiCreateChannelBookmarkLink(
            siteOneUrl, channelT5606.id, 'Emoji Icon Test', 'https://example.com',
        );
        if (!b?.id) {
            throw new Error('[beforeAll] Failed to create bookmarkT5606');
        }
        bookmarkT5606 = b;

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

    it('MM-T5606_1 - should be able to change the icon/emoji of a bookmark', async () => {
        // # Navigate to the channel
        await openChannel(channelT5606);

        // # Open channel info to see the bookmark
        await ChannelInfoScreen.open();

        // * Verify the bookmark is visible. Scope the testID to channel_info.bookmarks.list — the
        // same bookmark also renders in the header bar mounted behind the modal.
        await waitForBookmarkInChannelInfo(
            by.id(`channel_bookmark.${bookmarkT5606.id}`).withAncestor(by.id('channel_info.bookmarks.list')),
            {bookmarkId: bookmarkT5606.id},
        );

        // Scroll the bookmark into sufficient visibility (50%+) before longPress
        // CI failures showed bookmark was detected but not 50% visible for interaction
        const bookmarkEl = element(by.id(`channel_bookmark.${bookmarkT5606.id}`).withAncestor(by.id('channel_info.bookmarks.list')));
        try {
            await waitFor(bookmarkEl).
                toBeVisible().
                whileElement(by.id('channel_info.bookmarks.list')).
                scroll(50, 'right', 0.5, 0.5);
        } catch {
            // Element may already be visible; proceed with longPress
        }
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
        // openEmojiPickerFromEditModal disables Android sync and retries until the picker mounts.
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

        // * Verify the updated bookmark title and emoji are visible in channel info. bookmark-emoji
        // uses toExist(): the closing edit modal's UITransitionView still occludes it.
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
});
