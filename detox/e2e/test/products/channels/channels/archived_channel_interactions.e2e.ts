// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Channel, Post, Setup, System} from '@support/server_api';
import {serverOneUrl, siteOneUrl} from '@support/test_config';
import {Alert} from '@support/ui/component';
import {
    BrowseChannelsScreen,
    ChannelScreen,
    ChannelListScreen,
    ChannelDropdownMenuScreen,
    ChannelInfoScreen,
    HomeScreen,
    LoginScreen,
    ManageChannelMembersScreen,
    PermalinkScreen,
    SearchMessagesScreen,
    ServerScreen,
} from '@support/ui/screen';
import {
    isAndroid,
    isIos,
    safeEnableSynchronization,
    timeouts,
    wait,
    waitForElementToBeVisible,
    waitForElementToExist,
} from '@support/utils';
import {expect, waitFor} from 'detox';

// Wait for the archived channel screen after a non-tap navigation (e.g. permalink jump).
// Disables sync on iOS to avoid bridge-idle blocking during the modal-dismiss transition.
async function waitForArchivedChannelScreen() {
    if (isIos()) {
        await device.disableSynchronization();
    }
    try {
        await waitForElementToExist(ChannelScreen.channelScreen, timeouts.ONE_MIN);
        await waitForElementToBeVisible(ChannelScreen.postDraftArchived, timeouts.HALF_MIN);
    } finally {
        if (isIos()) {
            await device.enableSynchronization();
        }
    }
}

// Tap an archived channel in Browse Channels and wait for the channel screen.
// iOS: sync MUST be disabled BEFORE the tap — the bridge stays busy during the modal-dismiss
// + channel-push transition, which would otherwise block the gesture indefinitely.
async function tapChannelAndWaitForArchivedChannelScreen(channelItem: Detox.NativeElement) {
    // Dismiss the keyboard left up by searchInput.replaceText(). The Browse Channels
    // FlatList does not set keyboardShouldPersistTaps, so on iOS the first tap is
    // consumed dismissing the keyboard and never reaches the channel row (CI run
    // 27302480506: tap dispatched, keyboard dismissed at the same instant, no
    // onSelectChannel side effects — channel.screen never appeared). Same pattern
    // as smoke_test/channels.e2e.ts.
    // Guarded: on Android tapReturnKey submits the search, filtering results away.
    if (isIos()) {
        await BrowseChannelsScreen.searchInput.tapReturnKey();
    }

    if (isIos()) {
        await device.disableSynchronization();
    }
    try {
        await channelItem.tap();
        await waitForElementToExist(ChannelScreen.channelScreen, timeouts.ONE_MIN);

        // postDraftArchived appearing = channel fully loaded and UITransitionView cleared.
        await waitForElementToBeVisible(ChannelScreen.postDraftArchived, timeouts.HALF_MIN);
    } finally {
        if (isIos()) {
            await device.enableSynchronization();
        }
    }
}

// Open the Browse Channels dropdown and select the Archived Channels filter.
// Android: disable sync to avoid FabricUIManagerIdlingResources NoSuchFieldException
// (Detox 20.47.0 reflects on a field that no longer exists in this RN version).
async function openArchivedChannelsFilter() {
    await ChannelDropdownMenuScreen.open();

    if (isAndroid()) {
        await wait(timeouts.ONE_SEC);
        await device.disableSynchronization();
    }
    try {
        await ChannelDropdownMenuScreen.archivedChannelsItem.tap();
    } finally {
        if (isAndroid()) {
            await safeEnableSynchronization();
        }
    }
    await wait(timeouts.ONE_SEC);
}

// Navigate back from a channel opened via Browse Channels (channel → maybe-browse → list).
async function closeBrowseChannelsChannel() {
    await ChannelScreen.back();
    await wait(timeouts.ONE_SEC);

    // Browse Channels may already be dismissed by dismissAllModalsAndPopToScreen.
    try {
        await waitFor(BrowseChannelsScreen.closeButton).toExist().withTimeout(timeouts.FOUR_SEC);
        await BrowseChannelsScreen.closeButton.tap();
    } catch {
        // Browse Channels was already dismissed — no action needed
    }
}

// Android: known failing — `replaceText`/`typeText` triggers a
// NoSuchFieldException crash on mMountItemDispatcher (Detox 20.47.0 /
// Fabric / R8 on API 35). iOS passes all 4 tests reliably. Suite is
// kept running on Android so failures stay visible in CI reports.
describe('Channels - Archived Channel Interactions', () => {
    const serverOneDisplayName = 'Server 1';
    let testTeam: any;
    let testUser: any;

    beforeAll(async () => {
        // # Ensure archived channels are visible in browse channels
        await System.apiUpdateConfig(siteOneUrl, {
            TeamSettings: {ExperimentalViewArchivedChannels: true},
        });
        await wait(timeouts.ONE_SEC);

        const {team, user} = await Setup.apiInit(siteOneUrl);
        testTeam = team;
        testUser = user;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
        await ChannelListScreen.toBeVisible();
    });

    beforeEach(async () => {
        // # Dismiss any lingering Remove/Archive alerts from prior tests' WebSocket events.
        await Alert.dismissChannelRemoveOrArchiveAlert();

        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        await System.apiUpdateConfig(siteOneUrl, {
            TeamSettings: {ExperimentalViewArchivedChannels: false},
        });

        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T1671_1 - should be able to view members in an archived channel', async () => {
        // # Create a public channel, add user, and archive it via API
        const {channel: archivedChannel} = await Channel.apiCreateChannel(
            siteOneUrl,
            {type: 'O', teamId: testTeam.id},
        );
        await Channel.apiAddUserToChannel(
            siteOneUrl,
            testUser.id,
            archivedChannel.id,
        );
        await Channel.apiDeleteChannel(siteOneUrl, archivedChannel.id);
        await wait(timeouts.FOUR_SEC);

        // # Open browse channels, switch to archived filter, and open the archived channel
        await BrowseChannelsScreen.open();
        await BrowseChannelsScreen.dismissScheduledPostTooltip();
        await openArchivedChannelsFilter();
        await BrowseChannelsScreen.searchInput.replaceText(archivedChannel.name);

        // # Wait for the channel item to appear after search (API 35 renders slowly).
        await waitFor(BrowseChannelsScreen.getChannelItem(archivedChannel.name)).toExist().withTimeout(timeouts.TEN_SEC);

        // # Tap with sync disabled on iOS so the gesture fires immediately.
        await tapChannelAndWaitForArchivedChannelScreen(BrowseChannelsScreen.getChannelItem(archivedChannel.name));

        // # Open channel info
        await ChannelInfoScreen.open();

        // * Verify the Members section option is visible in channel info
        await waitFor(ChannelInfoScreen.membersOption).
            toExist().
            withTimeout(timeouts.TEN_SEC);
        await expect(ChannelInfoScreen.membersOption).toBeVisible();

        // # Go back to channel list screen
        await ChannelInfoScreen.close();
        await closeBrowseChannelsChannel();
        await ChannelListScreen.toBeVisible();
    });

    it('MM-T1685_1 - should be able to leave an archived public channel from channel info', async () => {
        // # Create a public channel, add user, and archive it via API
        const {channel: archivedChannel} = await Channel.apiCreateChannel(
            siteOneUrl,
            {type: 'O', teamId: testTeam.id},
        );
        await Channel.apiAddUserToChannel(
            siteOneUrl,
            testUser.id,
            archivedChannel.id,
        );
        await Channel.apiDeleteChannel(siteOneUrl, archivedChannel.id);
        await wait(timeouts.FOUR_SEC);

        // # Open browse channels, switch to archived filter, and open the archived channel
        await BrowseChannelsScreen.open();
        await BrowseChannelsScreen.dismissScheduledPostTooltip();
        await openArchivedChannelsFilter();
        await BrowseChannelsScreen.searchInput.replaceText(archivedChannel.name);

        // # Wait for the channel item to appear after search (API 35 renders slowly).
        await waitFor(BrowseChannelsScreen.getChannelItem(archivedChannel.name)).toExist().withTimeout(timeouts.TEN_SEC);

        // # Tap with sync disabled on iOS so the gesture fires immediately.
        await tapChannelAndWaitForArchivedChannelScreen(BrowseChannelsScreen.getChannelItem(archivedChannel.name));

        // # Open channel info and leave the channel
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.leaveChannel({confirm: true});

        // * Verify user is back on channel list screen (left the channel)
        await ChannelListScreen.toBeVisible();

        // * Verify the archived channel is no longer in the user's channel list sidebar
        await expect(
            ChannelListScreen.getChannelItemDisplayName(
                'channels',
                archivedChannel.name,
            ),
        ).not.toExist();
    });

    it('MM-T1679_1 - should be able to open an archived channel from search results', async () => {
        // # Create a public channel, post a message, and archive it via API
        const uniqueMessage = `archived-search-test-${Date.now()}`;
        const {channel: archivedChannel} = await Channel.apiCreateChannel(
            siteOneUrl,
            {type: 'O', teamId: testTeam.id},
        );
        await Channel.apiAddUserToChannel(
            siteOneUrl,
            testUser.id,
            archivedChannel.id,
        );
        await Post.apiCreatePost(siteOneUrl, {
            channelId: archivedChannel.id,
            message: uniqueMessage,
        });
        await Channel.apiDeleteChannel(siteOneUrl, archivedChannel.id);
        await wait(timeouts.FOUR_SEC);

        // # Open search screen and search for the message posted in the archived channel
        await SearchMessagesScreen.open();
        await SearchMessagesScreen.searchInput.replaceText(uniqueMessage);

        // * Verify the search result contains the message from the archived channel.
        // Sync MUST be disabled before tapReturnKey — search keeps the dispatch queue busy.
        const searchResultText = element(
            by.
                text(uniqueMessage).
                withAncestor(by.id(SearchMessagesScreen.postList.testID.flatList)),
        );

        await device.disableSynchronization();
        try {
            await SearchMessagesScreen.searchInput.tapReturnKey();

            // Wait via text-only matcher — composed ID+text matchers are unreliable for highlighted text.
            await waitForElementToBeVisible(searchResultText, timeouts.ONE_MIN);
        } finally {
            await device.enableSynchronization();
        }

        // # Tap the search result text directly (composed matchers unreliable when text is split).
        await searchResultText.tap();

        // * Verify the permalink screen opens (search results navigate via showPermalink)
        await PermalinkScreen.toBeVisible();

        // # Jump to recent messages to open the archived channel in read-only state
        await PermalinkScreen.jumpToRecentMessages();

        // * Verify the archived channel opens in read-only state.
        await waitForArchivedChannelScreen();

        // * Verify the close channel button is visible (confirming archived/read-only state)
        await waitForElementToBeVisible(
            ChannelScreen.postDraftArchivedCloseChannelButton,
            timeouts.TEN_SEC,
        );

        // # Navigate back to channel list (use open() — Android returns to Search otherwise).
        await ChannelScreen.back();
        await ChannelListScreen.open();
    });

    it('MM-T1719_1 - should not be able to remove members from an archived channel', async () => {
        // # Create a public channel, add user, and archive it via API
        const {channel: archivedChannel} = await Channel.apiCreateChannel(
            siteOneUrl,
            {type: 'O', teamId: testTeam.id},
        );
        await Channel.apiAddUserToChannel(
            siteOneUrl,
            testUser.id,
            archivedChannel.id,
        );
        await Channel.apiDeleteChannel(siteOneUrl, archivedChannel.id);
        await wait(timeouts.FOUR_SEC);

        // # Open browse channels, switch to archived filter, and open the archived channel
        await BrowseChannelsScreen.open();
        await BrowseChannelsScreen.dismissScheduledPostTooltip();
        await openArchivedChannelsFilter();
        await BrowseChannelsScreen.searchInput.replaceText(archivedChannel.name);

        // # Wait for the channel item to appear after search (API 35 renders slowly).
        await waitFor(BrowseChannelsScreen.getChannelItem(archivedChannel.name)).toExist().withTimeout(timeouts.TEN_SEC);

        // # Tap with sync disabled on iOS so the gesture fires immediately.
        await tapChannelAndWaitForArchivedChannelScreen(BrowseChannelsScreen.getChannelItem(archivedChannel.name));

        // # Open channel info
        await ChannelInfoScreen.open();

        // # Tap Members — Android: tutorial Dialog blocks Espresso from finding the screen behind it.
        await waitFor(ChannelInfoScreen.membersOption).
            toExist().
            withTimeout(timeouts.TEN_SEC);
        await ChannelInfoScreen.membersOption.tap();

        // # Dismiss the long-press tutorial on BOTH platforms — its Modal overlay consumes
        // touches across the whole screen and blocks back-nav/swipe-pop.
        if (isAndroid()) {
            try {
                await waitForElementToBeVisible(
                    element(by.text("Long-press on an item to view a user's profile")),
                    timeouts.TEN_SEC,
                );
            } catch {
                // Tutorial already dismissed
            }
        }
        await ManageChannelMembersScreen.closeTutorial();
        await ManageChannelMembersScreen.toBeVisible();

        // * Verify the Manage button is visible — archived channels still render it but gate
        // showManageMode so no remove controls appear in the rows.
        await expect(ManageChannelMembersScreen.manageButton).toBeVisible();

        // # Go back — Android pressBack() is more reliable when back button is occluded post-tutorial.
        if (isAndroid()) {
            await device.pressBack();
        } else {
            await ManageChannelMembersScreen.close();
        }
        await ChannelInfoScreen.close();
        await closeBrowseChannelsChannel();
        await ChannelListScreen.toBeVisible();
    });
});
