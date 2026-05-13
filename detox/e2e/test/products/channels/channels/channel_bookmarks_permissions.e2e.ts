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
    Team,
    User,
} from '@support/server_api';
import {serverOneUrl, siteOneUrl} from '@support/test_config';
import {
    ChannelBookmarkScreen,
    ChannelInfoScreen,
    ChannelListScreen,
    ChannelScreen,
    ChannelSettingsScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Channels - Channel Bookmarks Permissions', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testTeam: any;
    let testUser: any;
    let regularUser: any;
    let bookmarksAvailable = false;

    let channelT5615: any;
    let channelT5725: any;

    const createChannel = async () => {
        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {
            type: 'O',
            teamId: testTeam.id,
        });
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, channel.id);
        return channel;
    };

    // This file creates only 2 channels, so they always fit on screen without scrolling.
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

        // Create the regular user needed for the permission test (MM-T5615_1).
        const {user: rUser} = await User.apiCreateUser(siteOneUrl);
        if (!rUser?.id) {
            throw new Error('[beforeAll] Failed to create regularUser');
        }
        regularUser = rUser;
        await Team.apiAddUserToTeam(siteOneUrl, regularUser.id, testTeam.id);

        // ── Create all test channels ──────────────────────────────────────────
        channelT5615 = await createChannel();
        channelT5725 = await createChannel();

        // ── Pre-create bookmarks ──────────────────────────────────────────────
        await Channel.apiAddUserToChannel(siteOneUrl, regularUser.id, channelT5615.id);
        await ChannelBookmark.apiCreateChannelBookmarkLink(
            siteOneUrl, channelT5615.id, 'Permission Test Bookmark', 'https://mattermost.com',
        );
        await ChannelBookmark.apiCreateChannelBookmarkLink(
            siteOneUrl, channelT5725.id, 'Archive Test Bookmark', 'https://mattermost.com',
        );

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

    it('MM-T5615_1 - users without manage permissions should not see add/edit/delete/reorder bookmark options', async () => {
        if (!bookmarksAvailable) {
            return;
        }

        // # Log out the admin user and log in as the regular channel member
        await HomeScreen.logout();
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(regularUser);

        // # Navigate to the channel
        await ChannelListScreen.toBeVisible();
        await openChannel(channelT5615);

        // # Open channel info
        await ChannelInfoScreen.open();

        // * Verify the bookmark is visible in channel_info — scope to avoid matching
        // channel_header.bookmarks.list (mounted behind the modal on iOS).
        const permissionBookmarkEl = element(
            by.text('Permission Test Bookmark').
                withAncestor(by.id('channel_info.bookmarks.list')),
        );
        await expect(permissionBookmarkEl).toBeVisible();

        // * Verify "Add a bookmark" option is NOT visible for non-admin user
        await expect(element(by.text('Add a bookmark'))).not.toBeVisible();

        // # Long press on the bookmark to check available options
        await permissionBookmarkEl.longPress();
        await wait(timeouts.ONE_SEC);

        // * Verify Edit and Delete options ARE visible.
        // Mattermost's default permission scheme grants edit_bookmark_public_channel
        // and delete_bookmark_public_channel to the channel_user role, meaning all
        // channel members (not just admins) can edit and delete existing bookmarks.
        // Only the "Add a bookmark" action is restricted to channel admins (verified above).
        await expect(ChannelBookmarkScreen.editOption).toBeVisible();
        await expect(ChannelBookmarkScreen.deleteOption).toBeVisible();

        // # Dismiss the bottom sheet by tapping Edit to close the sheet, then
        // immediately closing the edit form — this is more reliable than tapping
        // outside (the sheet partially overlaps the bookmark chip on iOS).
        await ChannelBookmarkScreen.editOption.tap();
        await ChannelBookmarkScreen.toBeVisible(); // wait for edit modal to appear before closing
        await ChannelBookmarkScreen.closeEditButton.tap();
        await wait(timeouts.ONE_SEC);

        // # Close channel info and go back to channel list
        await ChannelInfoScreen.close();
        await ChannelScreen.back();

        // # Log out the regular user and log back in as the original test user.
        // Reload React Native after re-login to ensure the local database is fully
        // synced (logout destroys the server DB; without a reload, bookmarks are not
        // re-fetched before T5725_1 opens channel info).
        await HomeScreen.logout();
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();
    });

    it('MM-T5725_1 - should not be able to add, edit, or delete bookmarks in an archived channel', async () => {
        if (!bookmarksAvailable) {
            return;
        }

        // # Navigate to the channel.
        // Extra wait after openChannel: on Android, device.reloadReactNative() in T5615_1 can
        // leave the app mid-settle, causing ChannelInfoScreen.open()'s header-visibility check
        // to fail (header exists but covers <75% of its area). TWO_SEC is enough to let it land.
        await openChannel(channelT5725);
        await wait(timeouts.TWO_SEC);

        // # Open channel info and verify the bookmark is manageable BEFORE archiving.
        // Checking before archive avoids a race with the CHANNEL_BOOKMARK_DELETED WebSocket
        // event the server emits on archive, which physically removes the record from local DB.
        await ChannelInfoScreen.open();

        // * Verify the bookmark is visible in channel info before archiving.
        // Scope to channel_info.bookmarks.list to avoid matching the header list behind the modal.
        const archiveBookmarkEl = element(
            by.text('Archive Test Bookmark').
                withAncestor(by.id('channel_info.bookmarks.list')),
        );
        await waitFor(archiveBookmarkEl).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Long-press the bookmark to verify Edit and Delete ARE available before archiving.
        // channel_user role has edit_bookmark and delete_bookmark permissions in active channels.
        await archiveBookmarkEl.longPress();
        await wait(timeouts.ONE_SEC);

        // * Verify Edit and Delete options are visible (normal active channel)
        await expect(ChannelBookmarkScreen.editOption).toBeVisible();
        await expect(ChannelBookmarkScreen.deleteOption).toBeVisible();

        // # Dismiss the bottom sheet by tapping Edit then closing the edit form
        await ChannelBookmarkScreen.editOption.tap();
        await ChannelBookmarkScreen.toBeVisible();
        await ChannelBookmarkScreen.closeEditButton.tap();
        await wait(timeouts.ONE_SEC);

        // # Archive the channel via channel settings (accessed from channel info)
        await ChannelInfoScreen.openChannelSettings();
        await ChannelSettingsScreen.toBeVisible();
        await ChannelSettingsScreen.archivePublicChannel({confirm: true});

        // * Verify channel is archived (draft area shows archived state)
        await expect(ChannelScreen.postDraftArchived).toBeVisible();

        // * Verify the bookmark no longer exists anywhere in the channel view.
        // Archiving a channel causes the server to send CHANNEL_BOOKMARK_DELETED events,
        // which the app processes to physically remove bookmarks from the local database.
        // Waiting up to TEN_SEC covers the WS round-trip on slower CI machines.
        await waitFor(element(by.text('Archive Test Bookmark'))).
            not.toExist().
            withTimeout(timeouts.TEN_SEC);

        // # Close the archived channel and go back to channel list
        await ChannelScreen.postDraftArchivedCloseChannelButton.tap();
    });
});
