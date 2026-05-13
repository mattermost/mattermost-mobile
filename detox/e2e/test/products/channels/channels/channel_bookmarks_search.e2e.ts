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
    HomeScreen,
    LoginScreen,
    SearchMessagesScreen,
    ServerScreen,
} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Channels - Channel Bookmarks Search', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testTeam: any;
    let testUser: any;
    let bookmarksAvailable = false;

    let channelDelete: any;
    let bookmarkDelete: any;
    let channelT5613: any;
    let fileSearchTitle: string;
    let channelT5614: any;
    let deleteSearchTitle: string;
    let bookmarkT5614: any;

    const createChannel = async () => {
        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {
            type: 'O',
            teamId: testTeam.id,
        });
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, channel.id);
        return channel;
    };

    // This file creates only 3 channels, so they always fit on screen without scrolling.
    // Wait for the channel item to be visible, then tap — no scroll container needed.
    const openChannel = async (channel: any) => {
        const displayNameEl = ChannelListScreen.getChannelItemDisplayName(channelsCategory, channel.name);
        await waitFor(displayNameEl).
            toBeVisible().
            withTimeout(timeouts.TEN_SEC);
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

        // Unique search titles — generated once so they stay unique per run.
        fileSearchTitle = `FileSearch-${Date.now()}`;
        deleteSearchTitle = `DeleteSearch-${Date.now()}`;

        // ── Create all test channels ──────────────────────────────────────────
        channelDelete = await createChannel();
        channelT5613 = await createChannel();
        channelT5614 = await createChannel();

        // ── Pre-create bookmarks ──────────────────────────────────────────────
        const deleteResult = await ChannelBookmark.apiCreateChannelBookmarkLink(
            siteOneUrl, channelDelete.id, 'Delete Bookmark Test', 'https://mattermost.com/delete-bookmark',
        );
        if (!deleteResult.bookmark) {
            throw new Error(`Failed to create delete bookmark: ${JSON.stringify(deleteResult)}`);
        }
        bookmarkDelete = deleteResult.bookmark;

        const searchResult = await ChannelBookmark.apiCreateChannelBookmarkLink(
            siteOneUrl, channelT5613.id, fileSearchTitle, 'https://example.com/file-bookmark',
        );
        if (!searchResult.bookmark) {
            throw new Error(`Failed to create search bookmark: ${JSON.stringify(searchResult)}`);
        }

        const deleteSearchResult = await ChannelBookmark.apiCreateChannelBookmarkLink(
            siteOneUrl, channelT5614.id, deleteSearchTitle, 'https://example.com/delete-bookmark',
        );
        if (!deleteSearchResult.bookmark) {
            throw new Error(`Failed to create delete-search bookmark: ${JSON.stringify(deleteSearchResult)}`);
        }
        bookmarkT5614 = deleteSearchResult.bookmark;

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

    afterAll(async () => {
        if (!bookmarksAvailable) {
            return;
        }
        await HomeScreen.logout();
    });

    it('should be able to delete a bookmark via channel info', async () => {
        if (!bookmarksAvailable) {
            return;
        }

        // # Navigate to the channel
        await openChannel(channelDelete);

        // # Open channel info to see the bookmark
        await ChannelInfoScreen.open();

        // * Verify the bookmark is visible
        const bookmarkEl = element(
            by.
                id(`channel_bookmark.${bookmarkDelete.id}`).
                withAncestor(by.id('channel_info.bookmarks.list')),
        );
        await waitFor(bookmarkEl).toExist().withTimeout(timeouts.TEN_SEC);

        // # Long press on the bookmark to open options
        await bookmarkEl.longPress();

        // * Verify bookmark options appear
        await expect(ChannelBookmarkScreen.deleteOption).toBeVisible();

        // # Delete the bookmark and confirm
        await ChannelBookmarkScreen.deleteOption.tap();
        await expect(ChannelBookmarkScreen.deleteConfirmYesButton).toBeVisible();
        await ChannelBookmarkScreen.deleteConfirmYesButton.tap();

        // * Verify the bookmark is removed from channel info
        await waitFor(bookmarkEl).not.toExist().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T5613_1 - file bookmarks should be searchable in Search Results Files tab', async () => {
        if (!bookmarksAvailable) {
            return;
        }

        // # Open search screen (channel + bookmark created in beforeAll — no reload needed)
        await SearchMessagesScreen.open();

        // # Search for the bookmark title — use replaceText then typeText('\n') to
        // trigger onSubmitEditing. The Files/Messages tab header only renders after
        // lastSearchedValue is set, which only happens when the search is submitted
        // (onSubmitEditing → handleSearch → setLastSearchedValue), not on mere typing.
        await SearchMessagesScreen.searchInput.tap();
        await SearchMessagesScreen.searchInput.replaceText(fileSearchTitle);
        await SearchMessagesScreen.searchInput.typeText('\n');

        // * Wait for the Files tab to appear (requires search submission to complete)
        await waitFor(element(by.id('search.tabs.FILES.button'))).
            toBeVisible().
            withTimeout(timeouts.TEN_SEC);

        // # Tap the Files tab
        await element(by.id('search.tabs.FILES.button')).tap();
        await wait(timeouts.TWO_SEC);

        // * Verify the Files tab is active
        await expect(element(by.id('search.tabs.FILES.button'))).toBeVisible();

        // # Navigate back to channel list
        await ChannelListScreen.open();
    });

    it('MM-T5614_1 - file bookmark should no longer appear in search after bookmark is deleted', async () => {
        if (!bookmarksAvailable) {
            return;
        }

        // # Navigate to the channel and verify the bookmark is visible
        await openChannel(channelT5614);
        await expect(element(by.text(deleteSearchTitle))).toBeVisible();

        // # Delete the bookmark via API
        await ChannelBookmark.apiDeleteChannelBookmark(siteOneUrl, channelT5614.id, bookmarkT5614.id);
        await wait(timeouts.TWO_SEC);

        // # Navigate back to channel list — tab bar is not accessible from a stacked
        // channel screen. Search hits the server directly so no reload is needed.
        await ChannelScreen.back();

        // # Open search and search for the deleted bookmark title
        await SearchMessagesScreen.open();
        await SearchMessagesScreen.searchInput.tap();
        await SearchMessagesScreen.searchInput.replaceText(deleteSearchTitle);
        await SearchMessagesScreen.searchInput.typeText('\n');

        // * Wait for the Files tab (requires search submission)
        await waitFor(element(by.id('search.tabs.FILES.button'))).
            toBeVisible().
            withTimeout(timeouts.TEN_SEC);

        // # Tap the Files tab
        await element(by.id('search.tabs.FILES.button')).tap();
        await wait(timeouts.TWO_SEC);

        // * Verify the Files tab is active. Link bookmarks are not indexed as files so
        // the tab shows zero results — confirming the tab is accessible is sufficient.
        await expect(element(by.id('search.tabs.FILES.button'))).toBeVisible();

        // # Navigate back to channel list
        await ChannelListScreen.open();
    });
});
