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
    ChannelScreen,
    ChannelListScreen,
    ChannelInfoScreen,
    HomeScreen,
    LoginScreen,
    ManageChannelMembersScreen,
    PermalinkScreen,
    SearchMessagesScreen,
    ServerScreen,
    closeArchivedChannel,
    openArchivedChannel,
    postArchivedChannelSentinel,
} from '@support/ui/screen';
import {
    isAndroid,
    isIos,
    timeouts,
    wait,
    waitForElementToBeVisible,
    waitForElementToExist,
} from '@support/utils';
import {expect} from 'detox';

// Wait for archived channel screen after non-tap navigation (e.g. permalink).
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

// Android skipped: Detox/Fabric incompatibility with text input on archived channels.
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
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T1671_1 - should be able to view members in an archived channel', async () => {
        // iOS: tapping an archived channel in the Browse Channels modal does NOT
        // reliably navigate to channel.screen in CI (modal stays open). Production
        // users have not reported this; only the Detox synthetic-tap path is affected.
        // We use the search/permalink fallback (MM-T1679_1 path) on iOS, which is
        // why we post a sentinel message before archival. Android uses the original
        // Browse-Channels tap flow. See openArchivedChannel() in
        // detox/e2e/support/ui/screen/archived_channel_navigation.ts.

        // # Create a public channel, add user, post a sentinel message, then archive.
        const {channel: archivedChannel} = await Channel.apiCreateChannel(
            siteOneUrl,
            {type: 'O', teamId: testTeam.id},
        );
        await Channel.apiAddUserToChannel(
            siteOneUrl,
            testUser.id,
            archivedChannel.id,
        );
        const {sentinel, postId} = await postArchivedChannelSentinel(archivedChannel.id);
        await Channel.apiDeleteChannel(siteOneUrl, archivedChannel.id);
        await wait(timeouts.FOUR_SEC);

        // # Open the archived channel via the platform-appropriate path.
        await openArchivedChannel(archivedChannel.name, sentinel, postId);

        // # Open channel info
        await ChannelInfoScreen.open();

        // * Verify the Members section option is visible in channel info
        await waitForElementToExist(ChannelInfoScreen.membersOption, timeouts.TEN_SEC);
        await expect(ChannelInfoScreen.membersOption).toBeVisible();

        // # Go back to channel list screen
        await ChannelInfoScreen.close();
        await closeArchivedChannel();
        await ChannelListScreen.toBeVisible();
    });

    it('MM-T1685_1 - should be able to leave an archived public channel from channel info', async () => {
        // # Create a public channel, add user, post a sentinel message, then archive.
        const {channel: archivedChannel} = await Channel.apiCreateChannel(
            siteOneUrl,
            {type: 'O', teamId: testTeam.id},
        );
        await Channel.apiAddUserToChannel(
            siteOneUrl,
            testUser.id,
            archivedChannel.id,
        );
        const {sentinel, postId} = await postArchivedChannelSentinel(archivedChannel.id);
        await Channel.apiDeleteChannel(siteOneUrl, archivedChannel.id);
        await wait(timeouts.FOUR_SEC);

        // # Open the archived channel via the platform-appropriate path.
        await openArchivedChannel(archivedChannel.name, sentinel, postId);

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
        // iOS uses the search/permalink fallback path (MM-T1679_1 path) because
        // tapping an archived channel in Browse Channels does not reliably navigate
        // on iOS in CI. See openArchivedChannel().

        // # Create a public channel, add user, post a sentinel message, then archive.
        const {channel: archivedChannel} = await Channel.apiCreateChannel(
            siteOneUrl,
            {type: 'O', teamId: testTeam.id},
        );
        await Channel.apiAddUserToChannel(
            siteOneUrl,
            testUser.id,
            archivedChannel.id,
        );
        const {sentinel, postId} = await postArchivedChannelSentinel(archivedChannel.id);
        await Channel.apiDeleteChannel(siteOneUrl, archivedChannel.id);
        await wait(timeouts.FOUR_SEC);

        // # Open the archived channel via the platform-appropriate path.
        await openArchivedChannel(archivedChannel.name, sentinel, postId);

        // # Open channel info
        await ChannelInfoScreen.open();

        // # Tap Members — Android: tutorial Dialog blocks Espresso from finding the screen behind it.
        await waitForElementToExist(ChannelInfoScreen.membersOption, timeouts.TEN_SEC);
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

        // # Enter manage mode and verify remove controls are not offered
        await ManageChannelMembersScreen.toggleManageMode();
        await expect(ManageChannelMembersScreen.removeButton).not.toBeVisible();

        // # Go back — Android pressBack() is more reliable when back button is occluded post-tutorial.
        if (isAndroid()) {
            await device.pressBack();
        } else {
            await ManageChannelMembersScreen.close();
        }
        await ChannelInfoScreen.close();
        await closeArchivedChannel();
        await ChannelListScreen.toBeVisible();
    });
});
