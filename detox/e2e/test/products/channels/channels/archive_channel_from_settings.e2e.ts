// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Channel, Setup, System} from '@support/server_api';
import {serverOneUrl, siteOneUrl} from '@support/test_config';
import {Alert} from '@support/ui/component';
import {
    BrowseChannelsScreen,
    ChannelScreen,
    ChannelListScreen,
    ChannelDropdownMenuScreen,
    ChannelInfoScreen,
    ChannelSettingsScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {
    isIos,
    timeouts,
    wait,
    waitForElementToBeVisible,
    waitForElementToExist,
} from '@support/utils';
import {expect, waitFor} from 'detox';

/**
 * Tap an archived channel item in Browse Channels and wait for the channel screen.
 *
 * On iOS, tapping a channel in Browse Channels triggers concurrent modal dismissal
 * and channel screen push, producing a UITransitionView overlay that blocks Detox's
 * visibility/hittability checks. The bridge also stays busy during these transitions,
 * causing standard waitFor().toExist() to block waiting for bridge-idle that never
 * arrives within the timeout. Critically, the tap itself can stall if sync is still
 * enabled when the bridge is busy — so synchronization must be disabled before the
 * tap, not after.
 *
 * This helper:
 * 1. Disables Detox synchronization on iOS BEFORE the tap so the gesture dispatches
 *    immediately without waiting for bridge-idle
 * 2. Performs the tap on the provided channel item element
 * 3. Polls for the channel screen element to exist in the hierarchy
 * 4. Waits for the UITransitionView overlay to clear by polling for postDraftArchived
 * 5. Re-enables synchronization
 */
async function tapChannelAndWaitForArchivedChannelScreen(channelItem: Detox.NativeElement) {
    if (isIos()) {
        await device.disableSynchronization();
    }
    try {
        // Tap while sync is disabled so the gesture fires immediately even if the
        // bridge is still processing the modal-dismiss transition.
        await channelItem.tap();

        // Wait for the channel screen element to appear in the hierarchy.
        await waitForElementToExist(ChannelScreen.channelScreen, timeouts.ONE_MIN);

        // Wait for the UITransitionView overlay from modal dismissal to clear.
        // The archived post draft element is a reliable indicator that the channel
        // has fully loaded and the transition animation is complete.
        await waitForElementToBeVisible(ChannelScreen.postDraftArchived, timeouts.HALF_MIN);
    } finally {
        if (isIos()) {
            await device.enableSynchronization();
        }
    }
}

/**
 * Navigate back from a channel that was opened via Browse Channels.
 * Channel back → Browse Channels, then close Browse Channels.
 */
async function closeBrowseChannelsChannel() {
    await ChannelScreen.back();
    await wait(timeouts.ONE_SEC);

    // After Channel.back() the Browse Channels modal may already be dismissed
    // (dismissAllModalsAndPopToScreen closes it during navigation). Tap close
    // only if it is still present; swallow if already gone.
    try {
        await waitFor(BrowseChannelsScreen.closeButton).toExist().withTimeout(timeouts.FOUR_SEC);
        await BrowseChannelsScreen.closeButton.tap();
    } catch {
        // Browse Channels was already dismissed — no action needed
    }
}

describe('Channels - Archive Channel from Settings', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testTeam: any;
    let testUser: any;

    // Pre-created channels for tests that need to navigate to a live channel
    // via the sidebar before archiving. Created BEFORE login so they appear via
    // the initial HTTP channel sync instead of a WebSocket event — on Android
    // API 35 emulators, WS delivery can be delayed by several minutes after login.
    let channelForT4932_1: any;
    let channelForT4932_2: any;
    let channelForT4932_3: any;
    let channelForT3208: any;
    let channelForT1703: any;

    beforeAll(async () => {
        // # Ensure archived channels are visible in browse channels
        // Set config BEFORE login so the config is fetched during connection
        await System.apiUpdateConfig(siteOneUrl, {
            TeamSettings: {ExperimentalViewArchivedChannels: true},
        });
        await wait(timeouts.ONE_SEC);

        const {team, user} = await Setup.apiInit(siteOneUrl);
        testTeam = team;
        testUser = user;

        // Create channels and add testUser BEFORE login. The initial HTTP channel
        // sync on login fetches all member channels, so these appear in the sidebar
        // without depending on a WebSocket user_added event.
        const makeChannel = async (type: 'O' | 'P', prefix: string) => {
            const {channel} = await Channel.apiCreateChannel(siteOneUrl, {type, teamId: testTeam.id, prefix});
            await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, channel.id);
            return channel;
        };
        channelForT4932_1 = await makeChannel('O', 'arc-pub-1');
        channelForT4932_2 = await makeChannel('O', 'arc-pub-2');
        channelForT4932_3 = await makeChannel('P', 'arc-prv-1');
        channelForT3208 = await makeChannel('O', 'arc-pub-3');
        channelForT1703 = await makeChannel('O', 'arc-t1703');

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
        await ChannelListScreen.toBeVisible();
    });

    beforeEach(async () => {
        // Dismiss any lingering "Removed from channel" or "Archived channel"
        // dialogs that may have appeared asynchronously via WebSocket events
        // from the previous test's channel archival. These native Alert dialogs
        // block all Detox interactions until dismissed.
        await Alert.dismissChannelRemoveOrArchiveAlert();

        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T4932_1 - should be able to archive a public channel and confirm', async () => {
        // # Open a public channel screen, open channel info screen, go to channel settings, and tap on archive channel option and confirm
        const publicChannel = channelForT4932_1;
        await ChannelListScreen.waitForSidebarPublicChannelDisplayNameVisible(publicChannel.name, timeouts.ONE_MIN);
        await ChannelScreen.open(channelsCategory, publicChannel.name);
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.openChannelSettings();
        await ChannelSettingsScreen.toBeVisible();
        await ChannelSettingsScreen.archivePublicChannel({confirm: true});

        // # Channel settings closes but channel info modal remains; dismiss it to reach channel screen
        await ChannelInfoScreen.close();

        // * Verify the close channel button is visible (confirms archived state)
        await expect(
            ChannelScreen.postDraftArchivedCloseChannelButton,
        ).toBeVisible();

        // # Navigate back to channel list via back button
        await ChannelScreen.back();
        await ChannelListScreen.toBeVisible();
        await BrowseChannelsScreen.open();
        await BrowseChannelsScreen.searchInput.replaceText(publicChannel.name);

        // * Verify search returns no results in the default public channels view
        await waitFor(element(by.text(`No matches found for “${publicChannel.name}”`))).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await BrowseChannelsScreen.close();
    });

    it('MM-T4932_2 - should be able to archive a public channel and cancel', async () => {
        // # Open a public channel screen, open channel info screen, go to channel settings, and tap on archive channel option and cancel
        const publicChannel = channelForT4932_2;
        await ChannelListScreen.waitForSidebarPublicChannelDisplayNameVisible(publicChannel.name, timeouts.ONE_MIN);
        await ChannelScreen.open(channelsCategory, publicChannel.name);
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.openChannelSettings();
        await ChannelSettingsScreen.toBeVisible();
        await ChannelSettingsScreen.archivePublicChannel({confirm: false});

        // * Verify still on channel settings screen
        await ChannelSettingsScreen.toBeVisible();

        // # Go back to channel list screen
        await ChannelSettingsScreen.close();
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T4932_3 - should be able to archive a private channel and confirm', async () => {
        // # Open a private channel screen, open channel info screen, go to channel settings, and tap on archive channel option and confirm
        const privateChannel = channelForT4932_3;
        await ChannelListScreen.waitForSidebarPublicChannelDisplayNameVisible(privateChannel.name, timeouts.ONE_MIN);
        await ChannelScreen.open(channelsCategory, privateChannel.name);
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.openChannelSettings();
        await ChannelSettingsScreen.toBeVisible();
        await ChannelSettingsScreen.archivePrivateChannel({confirm: true});

        // # Channel settings closes but channel info modal remains; dismiss it to reach channel screen
        await ChannelInfoScreen.close();

        // * Verify the close channel button is visible (confirms archived state)
        await expect(
            ChannelScreen.postDraftArchivedCloseChannelButton,
        ).toBeVisible();

        // # Navigate back to channel list via back button
        await ChannelScreen.back();
        await ChannelListScreen.toBeVisible();
        await BrowseChannelsScreen.open();
        await BrowseChannelsScreen.searchInput.replaceText(privateChannel.name);

        // * Verify search returns no results in the default public channels view
        await waitFor(element(by.text(`No matches found for “${privateChannel.name}”`))).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await BrowseChannelsScreen.close();
    });

    it('MM-T3208 - should show confirmation dialog when archiving a channel and archive on confirm', async () => {
        // # Navigate to a pre-created public channel
        const publicChannel = channelForT3208;
        await ChannelListScreen.waitForSidebarPublicChannelDisplayNameVisible(publicChannel.name, timeouts.ONE_MIN);
        await ChannelScreen.open(channelsCategory, publicChannel.name);

        // # Open channel info, go to channel settings
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.openChannelSettings();
        await ChannelSettingsScreen.toBeVisible();

        // # Tap archive and cancel — verify still on channel settings screen
        await ChannelSettingsScreen.archivePublicChannel({confirm: false});
        await ChannelSettingsScreen.toBeVisible();

        // # Tap archive and confirm
        await ChannelSettingsScreen.archivePublicChannel({confirm: true});

        // # Channel settings closes but channel info modal remains; dismiss it to reach channel screen
        await ChannelInfoScreen.close();

        // * Verify the close channel button is visible (confirms archived state)
        await expect(
            ChannelScreen.postDraftArchivedCloseChannelButton,
        ).toBeVisible();

        // # Navigate back to channel list via back button
        await ChannelScreen.back();

        // * Verify channel list is shown (channel was archived successfully)
        await ChannelListScreen.toBeVisible();
    });

    it('MM-T1697 - should show archived channels option in browse public channels dropdown', async () => {
        // # Open browse channels screen
        await BrowseChannelsScreen.open();

        // * Verify the channel dropdown is visible
        await expect(BrowseChannelsScreen.channelDropdown).toBeVisible();

        // # Tap on the channel dropdown to open it
        await ChannelDropdownMenuScreen.open();

        // * Verify the archived channels option is present in the dropdown
        await expect(ChannelDropdownMenuScreen.archivedChannelsItem).toBeVisible();

        // * Verify the public channels option is also present
        await expect(ChannelDropdownMenuScreen.publicChannelsItem).toBeVisible();

        // # Select archived channels to verify it can be selected
        await ChannelDropdownMenuScreen.archivedChannelsItem.tap();

        // * Verify dropdown is dismissed and the archived channels filter is applied
        await BrowseChannelsScreen.toBeVisible();
        await expect(
            BrowseChannelsScreen.channelDropdownTextArchived,
        ).toBeVisible();

        // # Go back to channel list screen
        await BrowseChannelsScreen.close();
    });

    it('MM-T1703 - should be able to open archived channels and verify read-only state', async () => {
        // # Use pre-created channel (created before login to avoid WebSocket delay on Android)
        const archivedChannel = channelForT1703;
        await ChannelListScreen.waitForSidebarPublicChannelDisplayNameVisible(archivedChannel.name, timeouts.ONE_MIN);

        // # Navigate to the channel and archive it via UI
        await ChannelScreen.open(channelsCategory, archivedChannel.name);
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.openChannelSettings();
        await ChannelSettingsScreen.toBeVisible();
        await ChannelSettingsScreen.archivePublicChannel({confirm: true});

        // # Channel settings closes but channel info modal remains; dismiss it to reach channel screen
        await ChannelInfoScreen.close();

        // * Verify the archived post draft view is shown (channel is read-only)
        await expect(ChannelScreen.postDraftArchived).toBeVisible();

        // * Verify the close channel button is visible at the bottom
        await expect(
            ChannelScreen.postDraftArchivedCloseChannelButton,
        ).toBeVisible();

        // # Navigate back to channel list via back button
        await ChannelScreen.back();

        // * Verify back on channel list screen
        await ChannelListScreen.toBeVisible();

        // # Open browse channels, switch to archived channels, and search for the archived channel
        await BrowseChannelsScreen.open();
        await ChannelDropdownMenuScreen.open();
        await ChannelDropdownMenuScreen.archivedChannelsItem.tap();
        await wait(timeouts.ONE_SEC);
        await BrowseChannelsScreen.searchInput.replaceText(archivedChannel.name);

        // * Verify archived channel appears in the list
        await wait(timeouts.ONE_SEC);
        await expect(
            BrowseChannelsScreen.getChannelItemDisplayName(archivedChannel.name),
        ).toHaveText(archivedChannel.display_name);

        // # Tap on the archived channel to open it; waits with sync disabled on iOS
        // so the gesture fires before the bridge becomes busy with the modal transition.
        await tapChannelAndWaitForArchivedChannelScreen(BrowseChannelsScreen.getChannelItem(archivedChannel.name));

        // * Verify the close channel button is visible at the bottom
        await waitForElementToBeVisible(
            ChannelScreen.postDraftArchivedCloseChannelButton,
            timeouts.TEN_SEC,
        );

        // # Navigate back: channel → Browse Channels → channel list
        await closeBrowseChannelsChannel();

        // * Verify back on channel list screen
        await ChannelListScreen.toBeVisible();
    });
});
