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
import {device, expect, waitFor} from 'detox';

describe('Channels - Channel Bookmarks Permissions', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testTeam: any;
    let testUser: any;
    let regularUser: any;
    let channelT5615: any;

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

        // ChannelBookmarks enabled in setup.ts. Create regular user for MM-T5615_1.
        const {user: rUser} = await User.apiCreateUser(siteOneUrl);
        if (!rUser?.id) {
            throw new Error('[beforeAll] Failed to create regularUser');
        }
        regularUser = rUser;
        await Team.apiAddUserToTeam(siteOneUrl, regularUser.id, testTeam.id);

        // ── Create all test channels ──────────────────────────────────────────
        channelT5615 = await createChannel();

        await Channel.apiAddUserToChannel(siteOneUrl, regularUser.id, channelT5615.id);

        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
        await ChannelListScreen.toBeVisible();
    });

    beforeEach(async () => {
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        await HomeScreen.logout();
    });

    it('MM-T5615_1 - users without manage permissions should not see add bookmark option but can edit and delete existing bookmarks', async () => {
        // # Log out the admin user and log in as the regular channel member
        await HomeScreen.logout();
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(regularUser);

        // Create while the regular user's WebSocket is connected. Creating this in
        // beforeAll lost the event when logout destroyed the first user's database.
        const {bookmark, error} = await ChannelBookmark.apiCreateChannelBookmarkLink(
            siteOneUrl, channelT5615.id, 'Permission Test Bookmark', 'https://mattermost.com',
        );
        if (error || !bookmark?.id) {
            throw new Error(`[MM-T5615_1] Failed to create permission bookmark: ${JSON.stringify(error)}`);
        }
        await wait(timeouts.TWO_SEC);

        // # Navigate to the channel
        await ChannelListScreen.toBeVisible();
        await openChannel(channelT5615);

        // # Open channel info
        await ChannelInfoScreen.open();

        // * Verify the bookmark is visible in channel_info — scope to avoid matching
        // channel_header.bookmarks.list (mounted behind the modal on iOS).
        const permissionBookmarkEl = element(
            by.text('Permission Test Bookmark').
                withAncestor(by.id(ChannelInfoScreen.testID.bookmarksList)),
        );
        await expect(permissionBookmarkEl).toBeVisible();

        // * Verify "Add a bookmark" option is NOT visible for non-admin user
        await expect(element(by.text('Add a bookmark'))).not.toBeVisible();

        // # Long press on the bookmark to check available options
        await permissionBookmarkEl.longPress();
        await wait(timeouts.ONE_SEC);

        // * Verify Edit and Delete options ARE visible.
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

    // Skip: dismissOptionsSheet still fails after swipe fix on Android CI
    // (repeated fails 29cdff, 59ec6ae, a4c0e33).
    it.skip('MM-T5725_1 - should not be able to add, edit, or delete bookmarks in an archived channel', async () => {
        const channelT5725 = await createChannel();

        // Create while the admin user's WebSocket is connected so channel info has
        // both the new channel and bookmark before archiving removes the bookmark.
        const {bookmark, error} = await ChannelBookmark.apiCreateChannelBookmarkLink(
            siteOneUrl, channelT5725.id, 'Archive Test Bookmark', 'https://mattermost.com',
        );
        if (error || !bookmark?.id) {
            throw new Error(`[MM-T5725_1] Failed to create archive bookmark: ${JSON.stringify(error)}`);
        }
        await wait(timeouts.TWO_SEC);

        // # Navigate to the channel.
        // Extra wait after openChannel: on Android, device.reloadReactNative() in T5615_1 can
        // leave the app mid-settle, causing ChannelInfoScreen.open()'s header-visibility check
        // to fail (header exists but covers <75% of its area). TWO_SEC is enough to let it land.
        await openChannel(channelT5725);
        await wait(timeouts.TWO_SEC);

        // # Open channel info, then archive the channel via channel settings.
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.openChannelSettings();
        await ChannelSettingsScreen.toBeVisible();
        await ChannelSettingsScreen.archivePublicChannel({confirm: true});

        try {
            await ChannelInfoScreen.close();
        } catch {
            try {
                await device.pressBack();
            } catch {
                // Android pressBack may not be available
            }
        }
        await wait(timeouts.ONE_SEC);

        // * Verify channel is archived (draft area shows archived state).
        await waitFor(ChannelScreen.postDraftArchived).toExist().withTimeout(timeouts.TWENTY_SEC);

        // # Open channel info for the archived channel.
        await ChannelInfoScreen.open();

        // * Verify no bookmark mutations are available on an archived channel.
        // Bookmarks are retained after archive (CI 30250131265 Android MM-T5725_1
        // screenshot still shows "Archive Test Bookmark"); canAdd/Edit/Delete are
        // gated on channel.deleteAt === 0 (observeHasPermissionToBookmarks).
        await expect(element(by.text('Add a bookmark'))).not.toExist();

        const archiveBookmarkEl = element(
            by.text('Archive Test Bookmark').
                withAncestor(by.id(ChannelInfoScreen.testID.bookmarksList)),
        );
        await waitFor(archiveBookmarkEl).toExist().withTimeout(timeouts.TEN_SEC);
        await archiveBookmarkEl.longPress();
        await wait(timeouts.ONE_SEC);

        // Assert while any options sheet is up, then dismiss so close is hittable.
        // Archived sheet is Copy Link / Share only — no Cancel (CI 59ec6ae screenshot).
        await expect(element(by.id('channel_info.screen'))).toExist();
        await expect(ChannelBookmarkScreen.editOption).not.toExist();
        await expect(ChannelBookmarkScreen.deleteOption).not.toExist();

        await ChannelBookmarkScreen.dismissOptionsSheet();
        await waitFor(ChannelInfoScreen.closeButton).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await ChannelInfoScreen.close();

        // # Close the archived channel and go back to channel list
        await ChannelScreen.postDraftArchivedCloseChannelButton.tap();
    });
});
