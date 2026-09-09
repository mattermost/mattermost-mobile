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
    System,
    Team,
    User,
} from '@support/server_api';
import {serverOneUrl, siteOneUrl} from '@support/test_config';
import {Alert} from '@support/ui/component';
import {
    ChannelBookmarkScreen,
    ChannelInfoScreen,
    ChannelListScreen,
    ChannelScreen,
    ChannelSettingsScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
    closeArchivedChannel,
    openArchivedChannel,
    postArchivedChannelSentinel,
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
        // Members stay in an archived channel. The client only pops to the
        // channel list when ExperimentalViewArchivedChannels is false.
        await System.apiUpdateConfig(siteOneUrl, {
            TeamSettings: {ExperimentalViewArchivedChannels: true},
        });
        await wait(timeouts.ONE_SEC);

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
        await Alert.dismissChannelRemoveOrArchiveAlert();
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
        await permissionBookmarkEl.longPress(timeouts.FOUR_SEC);
        await wait(timeouts.ONE_SEC);

        // * Verify Edit and Delete options ARE visible.
        await expect(ChannelBookmarkScreen.editOption).toBeVisible();
        await expect(ChannelBookmarkScreen.deleteOption).toBeVisible();

        // # Dismiss the bottom sheet by tapping Edit and closing the edit form — more reliable
        // than tapping outside, since the sheet overlaps the bookmark chip on iOS.
        await ChannelBookmarkScreen.editOption.tap();
        await ChannelBookmarkScreen.toBeVisible(); // wait for edit modal to appear before closing
        await ChannelBookmarkScreen.closeEditButton.tap();
        await wait(timeouts.ONE_SEC);

        // # Close channel info and go back to channel list
        await ChannelInfoScreen.close();
        await ChannelScreen.back();

        // # Log out the regular user and log back in as the original test user. Reload after
        // re-login: logout destroys the server DB and bookmarks are not re-fetched otherwise.
        await HomeScreen.logout();
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();
    });

    it('MM-T5725_1 - should not be able to add, edit, or delete bookmarks in an archived channel', async () => {
        const channelT5725 = await createChannel();

        // Sentinel is required to reopen via search/permalink if archive kicks
        // the client to the channel list. Must be posted before archive.
        const {sentinel, postId} = await postArchivedChannelSentinel(channelT5725.id);

        // Create while the admin user's WebSocket is connected so channel info has
        // both the new channel and bookmark before archiving.
        const {bookmark, error} = await ChannelBookmark.apiCreateChannelBookmarkLink(
            siteOneUrl, channelT5725.id, 'Archive Test Bookmark', 'https://mattermost.com',
        );
        if (error || !bookmark?.id) {
            throw new Error(`[MM-T5725_1] Failed to create archive bookmark: ${JSON.stringify(error)}`);
        }
        await wait(timeouts.TWO_SEC);

        // # Navigate to the channel. On Android the reload in T5615_1 can leave the app mid-settle,
        // so give the channel info header time to land before ChannelInfoScreen.open() probes it.
        await openChannel(channelT5725);
        await wait(timeouts.TWO_SEC);

        // # Archive as a member. Server DeleteChannel soft-deletes and publishes
        // channel_deleted only — membership is kept. System Console can archive
        // without joining; a channel member cannot archive without being in it.
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.openChannelSettings();
        await ChannelSettingsScreen.toBeVisible();
        await ChannelSettingsScreen.archivePublicChannel({confirm: true});

        // The server publishes channel_deleted and keeps membership, but the client still
        // surfaces a "Removed from channel"/"Archived channel" alert and pops to the list when
        // it cannot view archived channels (CI testFnFailure.png). Dismiss and reopen. This is
        // a first, prompt alert; a second can arrive much later -- see the press below.
        await Alert.dismissChannelRemoveOrArchiveAlert();

        try {
            await ChannelInfoScreen.close();
        } catch {
            // Already gone if the client popped to the channel list.
        }

        try {
            await waitFor(ChannelScreen.postDraftArchivedCloseChannelButton).
                toBeVisible().
                withTimeout(timeouts.TEN_SEC);
        } catch {
            await openArchivedChannel(channelT5725.name, sentinel, postId);
        }

        // # Open channel info for the archived channel.
        await ChannelInfoScreen.open();

        // * Verify no bookmark mutations are available on an archived channel. Bookmarks are
        // retained after archive; add/edit/delete are gated on channel.deleteAt === 0.
        await expect(element(by.text('Add a bookmark'))).not.toExist();

        const archiveBookmarkEl = element(
            by.text('Archive Test Bookmark').
                withAncestor(by.id(ChannelInfoScreen.testID.bookmarksList)),
        );
        await waitFor(archiveBookmarkEl).toExist().withTimeout(timeouts.TEN_SEC);

        // Archiving soft-deletes the channel; the client reacts by raising a native
        // "Removed from channel"/"Archived channel" alert, and it can arrive late. On main run
        // 34267109236 a second such alert appeared 4.1s AFTER the long press had already been
        // dispatched and handled (device.log: touch down 21:26:44.316, touch up 21:26:48.325 +
        // "send gesture actions", then _willShowAlertController at 21:26:52.431, never removed).
        // So the press was not swallowed -- the client was torn out of channel info while the
        // sheet was opening and the sheet never mounted.
        //
        // Because the blocker lands after the press, draining beforehand cannot catch it. The
        // recovery therefore hangs off the sheet gate: press, gate, and only if the gate fails
        // AND an alert is actually present do we clear it, re-establish channel info and press
        // once more. Bounded at two presses, and gated on a named blocker rather than pressing
        // again blind -- if the gate fails with no alert up, the sheet genuinely did not mount
        // and that is an app defect to report, not something to retry.
        const reopenChannelInfo = async () => {
            await openArchivedChannel(channelT5725.name, sentinel, postId);
            await ChannelInfoScreen.open();
            await waitFor(archiveBookmarkEl).toExist().withTimeout(timeouts.TEN_SEC);
        };

        // Asserting the sheet is up is load-bearing, not decoration: the two absence checks
        // below pass trivially when no sheet exists at all, so without this gate the test
        // reported a green "no Edit/Delete" while never having opened the sheet, and only died
        // later on the unrelated dismiss step.
        const pressAndGateSheet = async () => {
            await archiveBookmarkEl.longPress(timeouts.FOUR_SEC);
            await waitFor(ChannelBookmarkScreen.optionsSheet).toBeVisible().withTimeout(timeouts.TEN_SEC);
        };

        try {
            await pressAndGateSheet();
        } catch (sheetError) {
            const dismissed = await Alert.dismissChannelRemoveOrArchiveAlert(timeouts.TWO_SEC);
            if (!dismissed) {
                throw sheetError;
            }
            await reopenChannelInfo();
            await pressAndGateSheet();
        }

        // Archived sheet is Copy Link / Share only — no Edit/Delete.
        await expect(ChannelBookmarkScreen.editOption).not.toExist();
        await expect(ChannelBookmarkScreen.deleteOption).not.toExist();

        await ChannelBookmarkScreen.dismissOptionsSheet();
        await waitFor(ChannelInfoScreen.closeButton).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await ChannelInfoScreen.close();

        await closeArchivedChannel();
    });
});
